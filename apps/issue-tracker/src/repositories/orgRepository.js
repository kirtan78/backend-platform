'use strict';

const { query } = require('@backend-platform/db');
const { v4: uuidv4 } = require('uuid');

async function create({ name }) {
  const result = await query(
    'INSERT INTO organizations (id, name) VALUES ($1, $2) RETURNING *',
    [uuidv4(), name]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await query('SELECT * FROM organizations WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function addMember({ orgId, userId, role }) {
  const result = await query(
    'INSERT INTO organization_members (id, org_id, user_id, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [uuidv4(), orgId, userId, role]
  );
  return result.rows[0];
}

async function getMember({ orgId, userId }) {
  const result = await query(
    'SELECT * FROM organization_members WHERE org_id = $1 AND user_id = $2',
    [orgId, userId]
  );
  return result.rows[0] || null;
}

async function getMembers({ orgId }) {
  const result = await query(
    `SELECT om.id, om.role, om.joined_at, u.id as user_id, u.email
     FROM organization_members om
     JOIN users u ON u.id = om.user_id
     WHERE om.org_id = $1
     ORDER BY om.joined_at ASC`,
    [orgId]
  );
  return result.rows;
}

async function getUserOrgs({ userId }) {
  const result = await query(
    `SELECT o.id, o.name, o.created_at, om.role
     FROM organizations o
     JOIN organization_members om ON om.org_id = o.id
     WHERE om.user_id = $1
     ORDER BY o.created_at ASC`,
    [userId]
  );
  return result.rows;
}

module.exports = { create, findById, addMember, getMember, getMembers, getUserOrgs };
