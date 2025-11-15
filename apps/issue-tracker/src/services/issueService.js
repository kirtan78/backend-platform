'use strict';

const { getRedisClient, publishEvent } = require('@backend-platform/db');
const { buildEvent, EVENT_TYPES, CHANNELS } = require('@backend-platform/types');
const { decodeCursor, buildPaginatedResponse } = require('@backend-platform/utils');
const { AppError } = require('../middleware/errorHandler');
const issueRepository = require('../repositories/issueRepository');
const logger = require('@backend-platform/logger');
const config = require('@backend-platform/config');

async function createIssue({ orgId, projectId, title, description, status, priority, assigneeId, createdBy }) {
  const issue = await issueRepository.create({
    orgId, projectId, title, description, status, priority, assigneeId, createdBy,
  });

  // Log activity
  await issueRepository.logActivity({
    issueId: issue.id, orgId, action: 'created',
    metadata: { title, status, priority },
  });

  // Invalidate cache for this project
  const redis = getRedisClient();
  const keys = await redis.keys(`issues:${projectId}:*`).catch(() => []);
  if (keys.length > 0) await redis.del(...keys).catch(() => {});

  // Publish event
  await publishEvent(CHANNELS.ISSUE_EVENTS, buildEvent(EVENT_TYPES.ISSUE_CREATED, {
    orgId, projectId, issueId: issue.id, actorId: createdBy,
  })).catch((err) => logger.error('Failed to publish IssueCreated', { error: err.message }));

  return issue;
}

async function listIssues({ orgId, projectId, status, priority, assigneeId, cursor, limit }) {
  limit = parseInt(limit, 10) || 20;
  const redis = getRedisClient();

  // Build cache key from all filter params
  const cacheKey = `issues:${projectId || orgId}:${status || 'all'}:${priority || 'all'}:${cursor || 'start'}:${limit}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    return JSON.parse(cached);
  }

  let afterDate = null;
  let afterId = null;
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      afterDate = decoded.createdAt;
      afterId = decoded.id;
    }
  }

  const items = await issueRepository.list({
    orgId, projectId, status, priority, assigneeId, afterDate, afterId, limit: limit + 1,
  });

  const response = buildPaginatedResponse(items, limit, (item) => ({
    createdAt: item.created_at,
    id: item.id,
  }));

  await redis.setex(cacheKey, 60, JSON.stringify(response)).catch(() => {});

  return response;
}

async function updateIssue({ issueId, updates, actorId, orgId }) {
  const existing = await issueRepository.findById({ issueId, orgId });
  if (!existing) {
    throw new AppError('Issue not found', 404, 'NOT_FOUND');
  }

  const changes = {};
  if (updates.title !== undefined) changes.title = updates.title;
  if (updates.description !== undefined) changes.description = updates.description;
  if (updates.status !== undefined) changes.status = updates.status;
  if (updates.priority !== undefined) changes.priority = updates.priority;
  if (updates.assigneeId !== undefined) changes.assignee_id = updates.assigneeId;

  const issue = await issueRepository.update({ issueId, orgId, changes });

  // Log activity
  await issueRepository.logActivity({
    issueId, orgId, action: 'updated', metadata: { changes },
  });

  // Invalidate cache for this project
  const redis = getRedisClient();
  const keys = await redis.keys(`issues:${existing.project_id}:*`).catch(() => []);
  if (keys.length > 0) await redis.del(...keys).catch(() => {});

  // Publish event
  await publishEvent(CHANNELS.ISSUE_EVENTS, buildEvent(EVENT_TYPES.ISSUE_UPDATED, {
    orgId, projectId: existing.project_id, issueId, actorId, changes,
  })).catch((err) => logger.error('Failed to publish IssueUpdated', { error: err.message }));

  return issue;
}

async function addComment({ issueId, orgId, userId, content }) {
  const issue = await issueRepository.findById({ issueId, orgId });
  if (!issue) {
    throw new AppError('Issue not found', 404, 'NOT_FOUND');
  }

  const comment = await issueRepository.addComment({ issueId, orgId, userId, content });

  // Log activity
  await issueRepository.logActivity({
    issueId, orgId, action: 'comment_added', metadata: { commentId: comment.id },
  });

  // Publish event
  await publishEvent(CHANNELS.ISSUE_EVENTS, buildEvent(EVENT_TYPES.COMMENT_ADDED, {
    orgId, projectId: issue.project_id, issueId, commentId: comment.id, actorId: userId,
  })).catch((err) => logger.error('Failed to publish CommentAdded', { error: err.message }));

  return comment;
}

async function summarizeIssue({ issueId, orgId }) {
  const issue = await issueRepository.findById({ issueId, orgId });
  if (!issue) {
    throw new AppError('Issue not found', 404, 'NOT_FOUND');
  }

  const comments = await issueRepository.getComments({ issueId, orgId });

  if (!config.openai.apiKey) {
    throw new AppError('AI summarization not configured (missing OPENAI_API_KEY)', 503, 'SERVICE_UNAVAILABLE');
  }

  const { OpenAI } = require('openai');
  const openai = new OpenAI({ apiKey: config.openai.apiKey });

  const commentsText = comments.map((c) => `- ${c.content}`).join('\n');
  const prompt = `Summarize the following issue for an engineering team. Be concise (2-3 sentences). Focus on the problem, current status, and key discussion points.

Title: ${issue.title}
Description: ${issue.description || 'No description provided.'}
Status: ${issue.status}
Priority: ${issue.priority}

Comments:
${commentsText || 'No comments yet.'}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
  });

  const summary = completion.choices[0].message.content.trim();

  await issueRepository.updateSummary({ issueId, orgId, summary });

  return { issueId, summary };
}

async function getActivity({ issueId, orgId }) {
  return issueRepository.getActivity({ issueId, orgId });
}

module.exports = { createIssue, listIssues, updateIssue, addComment, summarizeIssue, getActivity };
