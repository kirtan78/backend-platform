'use strict';

const { query } = require('@backend-platform/db');
const { v4: uuidv4 } = require('uuid');

async function create({ email, passwordHash }) {
  const result = await query(
    'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, created_at',
    [uuidv4(), email, passwordHash]
  );
  return result.rows[0];
}

async function findByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

async function findById(id) {
  const result = await query('SELECT id, email, created_at FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

module.exports = { create, findByEmail, findById };
