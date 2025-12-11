'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'backend_platform',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding demo data...');

    await client.query('DELETE FROM issue_activity');
    await client.query('DELETE FROM issue_comments');
    await client.query('DELETE FROM issues');
    await client.query('DELETE FROM projects');
    await client.query('DELETE FROM organization_members');
    await client.query('DELETE FROM organizations');
    await client.query('DELETE FROM users');

    const passwordHash = await bcrypt.hash('Password123!', 12);

    const users = [
      { id: uuidv4(), email: 'alice@acme.com' },
      { id: uuidv4(), email: 'bob@acme.com' },
      { id: uuidv4(), email: 'carol@globex.com' },
      { id: uuidv4(), email: 'dave@globex.com' },
    ];

    for (const u of users) {
      await client.query('INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)', [u.id, u.email, passwordHash]);
    }

    const orgs = [
      { id: uuidv4(), name: 'Acme Corp' },
      { id: uuidv4(), name: 'Globex Inc' },
    ];

    for (const o of orgs) {
      await client.query('INSERT INTO organizations (id, name) VALUES ($1, $2)', [o.id, o.name]);
    }

    const memberships = [
      { orgId: orgs[0].id, userId: users[0].id, role: 'admin' },
      { orgId: orgs[0].id, userId: users[1].id, role: 'member' },
      { orgId: orgs[1].id, userId: users[2].id, role: 'admin' },
      { orgId: orgs[1].id, userId: users[3].id, role: 'member' },
    ];

    for (const m of memberships) {
      await client.query('INSERT INTO organization_members (id, org_id, user_id, role) VALUES ($1, $2, $3, $4)', [uuidv4(), m.orgId, m.userId, m.role]);
    }

    const projects = [
      { id: uuidv4(), orgId: orgs[0].id, name: 'Platform API', createdBy: users[0].id },
      { id: uuidv4(), orgId: orgs[0].id, name: 'Mobile App', createdBy: users[1].id },
      { id: uuidv4(), orgId: orgs[1].id, name: 'Analytics Dashboard', createdBy: users[2].id },
    ];

    for (const p of projects) {
      await client.query('INSERT INTO projects (id, org_id, name, created_by) VALUES ($1, $2, $3, $4)', [p.id, p.orgId, p.name, p.createdBy]);
    }

    const issueData = [
      { projectId: projects[0].id, orgId: orgs[0].id, title: 'Implement JWT refresh token', status: 'open', priority: 'high', createdBy: users[0].id },
      { projectId: projects[0].id, orgId: orgs[0].id, title: 'Add rate limiting to auth endpoints', status: 'in_progress', priority: 'high', createdBy: users[0].id, assigneeId: users[1].id },
      { projectId: projects[0].id, orgId: orgs[0].id, title: 'Fix CORS configuration for staging', status: 'done', priority: 'medium', createdBy: users[1].id },
      { projectId: projects[0].id, orgId: orgs[0].id, title: 'Optimize issue list query with indexes', status: 'open', priority: 'medium', createdBy: users[1].id, assigneeId: users[0].id },
      { projectId: projects[1].id, orgId: orgs[0].id, title: 'Push notification support for iOS', status: 'open', priority: 'urgent', createdBy: users[0].id },
      { projectId: projects[1].id, orgId: orgs[0].id, title: 'App crashes on Android 12', status: 'in_progress', priority: 'urgent', createdBy: users[1].id, assigneeId: users[1].id },
      { projectId: projects[1].id, orgId: orgs[0].id, title: 'Dark mode implementation', status: 'open', priority: 'low', createdBy: users[0].id },
      { projectId: projects[2].id, orgId: orgs[1].id, title: 'Build DAU metric aggregation', status: 'open', priority: 'high', createdBy: users[2].id },
      { projectId: projects[2].id, orgId: orgs[1].id, title: 'Set up MongoDB time-series collection', status: 'in_progress', priority: 'medium', createdBy: users[2].id, assigneeId: users[3].id },
      { projectId: projects[2].id, orgId: orgs[1].id, title: 'Dashboard chart rendering performance', status: 'open', priority: 'medium', createdBy: users[3].id },
    ];

    const issues = [];
    for (const i of issueData) {
      const id = uuidv4();
      await client.query(
        'INSERT INTO issues (id, project_id, org_id, title, status, priority, created_by, assignee_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, i.projectId, i.orgId, i.title, i.status, i.priority, i.createdBy, i.assigneeId || null]
      );
      issues.push({ id, ...i });
    }

    const comments = [
      { issueId: issues[0].id, orgId: orgs[0].id, userId: users[1].id, content: 'We should use refresh token rotation to prevent token theft.' },
      { issueId: issues[0].id, orgId: orgs[0].id, userId: users[0].id, content: 'Agreed. Storing refresh tokens in Redis with 30-day TTL.' },
      { issueId: issues[1].id, orgId: orgs[0].id, userId: users[0].id, content: 'Using sliding window algorithm with Redis would work well here.' },
    ];

    for (const c of comments) {
      await client.query('INSERT INTO issue_comments (id, issue_id, org_id, user_id, content) VALUES ($1, $2, $3, $4, $5)', [uuidv4(), c.issueId, c.orgId, c.userId, c.content]);
    }

    console.log('Demo data seeded successfully!');
    console.log('Login credentials: alice@acme.com / bob@acme.com / carol@globex.com / dave@globex.com');
    console.log('Password for all: Password123!');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
