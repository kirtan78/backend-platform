'use strict';

const { subscribeToChannel } = require('@backend-platform/db');
const { CHANNELS, EVENT_TYPES } = require('@backend-platform/types');
const logger = require('@backend-platform/logger');
const { enqueueNotification } = require('../queues/notificationQueue');

/**
 * Handle IssueCreated event → create notification jobs
 */
async function handleIssueCreated(payload) {
  logger.info('Handling IssueCreated event', { orgId: payload.orgId, issueId: payload.issueId });

  const eventId = `${payload.issueId}-${payload.timestamp}`;

  // Enqueue email notification
  await enqueueNotification('send_email', {
    eventId: `email-${eventId}`,
    eventType: EVENT_TYPES.ISSUE_CREATED,
    orgId: payload.orgId,
    issueId: payload.issueId,
    projectId: payload.projectId,
    actorId: payload.actorId,
    recipientEmail: 'team@example.com',
    title: 'New Issue Created',
    body: `A new issue has been created in your project.`,
    metadata: { issueId: payload.issueId },
  });

  // Enqueue in-app notification
  await enqueueNotification('send_in_app', {
    eventId: `inapp-${eventId}`,
    eventType: EVENT_TYPES.ISSUE_CREATED,
    orgId: payload.orgId,
    userId: payload.actorId,
    issueId: payload.issueId,
    title: 'New Issue Created',
    body: 'A new issue has been added to your organization.',
    metadata: { issueId: payload.issueId, projectId: payload.projectId },
  });
}

/**
 * Handle IssueUpdated event → create notification jobs
 */
async function handleIssueUpdated(payload) {
  logger.info('Handling IssueUpdated event', { orgId: payload.orgId, issueId: payload.issueId });

  const eventId = `${payload.issueId}-${payload.timestamp}`;

  await enqueueNotification('send_in_app', {
    eventId: `inapp-update-${eventId}`,
    eventType: EVENT_TYPES.ISSUE_UPDATED,
    orgId: payload.orgId,
    userId: payload.actorId,
    issueId: payload.issueId,
    title: 'Issue Updated',
    body: `Issue ${payload.issueId} was updated.`,
    metadata: { changes: payload.changes },
  });
}

/**
 * Handle CommentAdded event → create notification jobs
 */
async function handleCommentAdded(payload) {
  logger.info('Handling CommentAdded event', { orgId: payload.orgId, issueId: payload.issueId });

  const eventId = `${payload.commentId}-${payload.timestamp}`;

  await enqueueNotification('send_in_app', {
    eventId: `inapp-comment-${eventId}`,
    eventType: EVENT_TYPES.COMMENT_ADDED,
    orgId: payload.orgId,
    userId: payload.actorId,
    issueId: payload.issueId,
    title: 'New Comment',
    body: 'A new comment was added to an issue.',
    metadata: { commentId: payload.commentId, issueId: payload.issueId },
  });

  // Webhook notification for comment events
  await enqueueNotification('send_webhook', {
    eventId: `webhook-comment-${eventId}`,
    eventType: EVENT_TYPES.COMMENT_ADDED,
    orgId: payload.orgId,
    targetUrl: `https://webhook.site/example-${payload.orgId}`,
    title: 'Comment Added',
    body: JSON.stringify(payload),
    metadata: payload,
  });
}

/**
 * Handle UserInvited event → create notification jobs
 */
async function handleUserInvited(payload) {
  logger.info('Handling UserInvited event', { orgId: payload.orgId, invitedUserId: payload.invitedUserId });

  await enqueueNotification('send_email', {
    eventId: `email-invite-${payload.invitedUserId}-${payload.timestamp}`,
    eventType: EVENT_TYPES.USER_INVITED,
    orgId: payload.orgId,
    recipientEmail: 'invited-user@example.com',
    title: 'You have been invited to an organization',
    body: `You have been invited to join an organization with role: ${payload.role}`,
    metadata: { role: payload.role },
  });
}

/**
 * Route an event to the appropriate handler
 */
async function routeEvent(payload) {
  switch (payload.type) {
    case EVENT_TYPES.ISSUE_CREATED:
      await handleIssueCreated(payload);
      break;
    case EVENT_TYPES.ISSUE_UPDATED:
      await handleIssueUpdated(payload);
      break;
    case EVENT_TYPES.COMMENT_ADDED:
      await handleCommentAdded(payload);
      break;
    case EVENT_TYPES.USER_INVITED:
      await handleUserInvited(payload);
      break;
    default:
      logger.warn('Unknown event type received', { type: payload.type });
  }
}

/**
 * Start subscribing to Redis event channels
 */
async function startEventSubscriber() {
  await subscribeToChannel(CHANNELS.ISSUE_EVENTS, routeEvent);
  logger.info('Event subscriber started', { channel: CHANNELS.ISSUE_EVENTS });
}

module.exports = { startEventSubscriber };
