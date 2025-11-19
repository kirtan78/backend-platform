'use strict';

const logger = require('@backend-platform/logger');
const { hashPassword } = require('@backend-platform/auth');
const { query } = require('@backend-platform/db');
const { v4: uuidv4 } = require('uuid');

async function runSeed(req, res, next) {
  try {
    logger.info('Running demo seed...');

    // Clear existing data in reverse dependency order
    await query('DELETE FROM issue_activity');
    await query('DELETE FROM issue_comments');
    await query('DELETE FROM issues');
    await query('DELETE FROM projects');
    await query('DELETE FROM organization_members');
    await query('DELETE FROM organizations');
    await query('DELETE FROM users');

    // Create 4 users
    const passwordHash = await hashPassword('Password123!');
    const users = [
      { id: uuidv4(), email: 'alice@acme.com', name: 'Alice Chen' },
      { id: uuidv4(), email: 'bob@acme.com', name: 'Bob Smith' },
      { id: uuidv4(), email: 'carol@globex.com', name: 'Carol Davis' },
      { id: uuidv4(), email: 'dave@globex.com', name: 'Dave Wilson' },
    ];

    for (const u of users) {
      await query(
        'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
        [u.id, u.email, passwordHash]
      );
    }

    // Create 2 orgs
    const orgs = [
      { id: uuidv4(), name: 'Acme Corp' },
      { id: uuidv4(), name: 'Globex Inc' },
    ];

    for (const o of orgs) {
      await query('INSERT INTO organizations (id, name) VALUES ($1, $2)', [o.id, o.name]);
    }

    // Memberships: alice & bob in Acme, carol & dave in Globex
    const memberships = [
      { orgId: orgs[0].id, userId: users[0].id, role: 'admin' },
      { orgId: orgs[0].id, userId: users[1].id, role: 'member' },
      { orgId: orgs[1].id, userId: users[2].id, role: 'admin' },
      { orgId: orgs[1].id, userId: users[3].id, role: 'member' },
    ];

    for (const m of memberships) {
      await query(
        'INSERT INTO organization_members (id, org_id, user_id, role) VALUES ($1, $2, $3, $4)',
        [uuidv4(), m.orgId, m.userId, m.role]
      );
    }

    // Create 3 projects (2 in Acme, 1 in Globex)
    const projects = [
      { id: uuidv4(), orgId: orgs[0].id, name: 'Platform API', createdBy: users[0].id },
      { id: uuidv4(), orgId: orgs[0].id, name: 'Mobile App', createdBy: users[1].id },
      { id: uuidv4(), orgId: orgs[1].id, name: 'Analytics Dashboard', createdBy: users[2].id },
    ];

    for (const p of projects) {
      await query(
        'INSERT INTO projects (id, org_id, name, created_by) VALUES ($1, $2, $3, $4)',
        [p.id, p.orgId, p.name, p.createdBy]
      );
    }

    // Create 10 issues
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
      const issueId = uuidv4();
      await query(
        `INSERT INTO issues (id, project_id, org_id, title, status, priority, created_by, assignee_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [issueId, i.projectId, i.orgId, i.title, i.status, i.priority, i.createdBy, i.assigneeId || null]
      );
      issues.push({ id: issueId, ...i });
    }

    // Add comments to first 3 issues
    const commentData = [
      { issueId: issues[0].id, orgId: orgs[0].id, userId: users[1].id, content: 'We should use refresh token rotation to prevent token theft.' },
      { issueId: issues[0].id, orgId: orgs[0].id, userId: users[0].id, content: 'Agreed. Let us store refresh tokens in Redis with a 30-day TTL.' },
      { issueId: issues[1].id, orgId: orgs[0].id, userId: users[0].id, content: 'Using a sliding window algorithm with Redis would work well here.' },
      { issueId: issues[2].id, orgId: orgs[0].id, userId: users[1].id, content: 'Fixed by updating the allowed origins list in app.js.' },
    ];

    for (const c of commentData) {
      await query(
        'INSERT INTO issue_comments (id, issue_id, org_id, user_id, content) VALUES ($1, $2, $3, $4, $5)',
        [uuidv4(), c.issueId, c.orgId, c.userId, c.content]
      );
    }

    // Activity logs
    for (const issue of issues.slice(0, 5)) {
      await query(
        `INSERT INTO issue_activity (id, issue_id, org_id, action, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), issue.id, issue.orgId, 'created', JSON.stringify({ title: issue.title })]
      );
    }

    logger.info('Demo seed completed successfully');

    res.json({
      success: true,
      data: {
        message: 'Demo data seeded successfully',
        users: users.map((u) => ({ email: u.email, password: 'Password123!' })),
        orgs: orgs.map((o) => ({ id: o.id, name: o.name })),
        projects: projects.map((p) => ({ id: p.id, name: p.name })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { runSeed };
