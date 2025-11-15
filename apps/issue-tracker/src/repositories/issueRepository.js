'use strict';

const { query } = require('@backend-platform/db');
const { v4: uuidv4 } = require('uuid');

async function create({ orgId, projectId, title, description, status, priority, assigneeId, createdBy }) {
  const result = await query(
    `INSERT INTO issues (id, project_id, org_id, title, description, status, priority, assignee_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [uuidv4(), projectId, orgId, title, description || '', status, priority, assigneeId, createdBy]
  );
  return result.rows[0];
}

async function findById({ issueId, orgId }) {
  const result = await query(
    'SELECT * FROM issues WHERE id = $1 AND org_id = $2',
    [issueId, orgId]
  );
  return result.rows[0] || null;
}

async function list({ orgId, projectId, status, priority, assigneeId, afterDate, afterId, limit }) {
  const conditions = ['i.org_id = $1'];
  const params = [orgId];
  let idx = 2;

  if (projectId) { conditions.push(`i.project_id = $${idx++}`); params.push(projectId); }
  if (status) { conditions.push(`i.status = $${idx++}`); params.push(status); }
  if (priority) { conditions.push(`i.priority = $${idx++}`); params.push(priority); }
  if (assigneeId) { conditions.push(`i.assignee_id = $${idx++}`); params.push(assigneeId); }

  if (afterDate && afterId) {
    conditions.push(`(i.created_at, i.id) < ($${idx++}, $${idx++})`);
    params.push(afterDate, afterId);
  }

  const where = conditions.join(' AND ');
  params.push(limit);

  const result = await query(
    `SELECT i.*, u.email as assignee_email
     FROM issues i
     LEFT JOIN users u ON u.id = i.assignee_id
     WHERE ${where}
     ORDER BY i.created_at DESC, i.id DESC
     LIMIT $${idx}`,
    params
  );
  return result.rows;
}

async function update({ issueId, orgId, changes }) {
  const setClauses = Object.keys(changes).map((k, i) => `${k} = $${i + 3}`);
  const values = Object.values(changes);

  const result = await query(
    `UPDATE issues SET ${setClauses.join(', ')}, updated_at = NOW()
     WHERE id = $1 AND org_id = $2
     RETURNING *`,
    [issueId, orgId, ...values]
  );
  return result.rows[0];
}

async function updateSummary({ issueId, orgId, summary }) {
  const result = await query(
    'UPDATE issues SET ai_summary = $3 WHERE id = $1 AND org_id = $2 RETURNING *',
    [issueId, orgId, summary]
  );
  return result.rows[0];
}

async function addComment({ issueId, orgId, userId, content }) {
  const result = await query(
    'INSERT INTO issue_comments (id, issue_id, org_id, user_id, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [uuidv4(), issueId, orgId, userId, content]
  );
  return result.rows[0];
}

async function getComments({ issueId, orgId }) {
  const result = await query(
    `SELECT c.*, u.email as user_email
     FROM issue_comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.issue_id = $1 AND c.org_id = $2
     ORDER BY c.created_at ASC`,
    [issueId, orgId]
  );
  return result.rows;
}

async function logActivity({ issueId, orgId, action, metadata }) {
  await query(
    'INSERT INTO issue_activity (id, issue_id, org_id, action, metadata) VALUES ($1, $2, $3, $4, $5)',
    [uuidv4(), issueId, orgId, action, JSON.stringify(metadata || {})]
  );
}

async function getActivity({ issueId, orgId }) {
  const result = await query(
    'SELECT * FROM issue_activity WHERE issue_id = $1 AND org_id = $2 ORDER BY created_at DESC',
    [issueId, orgId]
  );
  return result.rows;
}

module.exports = {
  create, findById, list, update, updateSummary,
  addComment, getComments, logActivity, getActivity,
};
