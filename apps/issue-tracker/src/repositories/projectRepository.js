'use strict';

const { query } = require('@backend-platform/db');
const { v4: uuidv4 } = require('uuid');

async function create({ orgId, name, createdBy }) {
  const result = await query(
    'INSERT INTO projects (id, org_id, name, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
    [uuidv4(), orgId, name, createdBy]
  );
  return result.rows[0];
}

async function findById({ projectId, orgId }) {
  const result = await query(
    'SELECT * FROM projects WHERE id = $1 AND org_id = $2',
    [projectId, orgId]
  );
  return result.rows[0] || null;
}

async function listByOrg({ orgId }) {
  const result = await query(
    'SELECT * FROM projects WHERE org_id = $1 ORDER BY created_at ASC',
    [orgId]
  );
  return result.rows;
}

module.exports = { create, findById, listByOrg };
