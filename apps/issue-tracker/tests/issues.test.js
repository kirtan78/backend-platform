'use strict';

process.env.NODE_ENV = 'test';
process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';
process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'backend_platform_test';
process.env.POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

const request = require('supertest');
const app = require('../src/server');
const { query, closePool, closeRedis } = require('@backend-platform/db');
const { v4: uuidv4 } = require('uuid');

let token;
let orgId;
let projectId;

beforeAll(async () => {
  const email = `issues_test_${Date.now()}@example.com`;
  const regRes = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'Password123!' });

  token = regRes.body.data.token;

  const orgRes = await request(app)
    .post('/api/v1/org')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Org' });

  orgId = orgRes.body.data.id;

  const projRes = await request(app)
    .post('/api/v1/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ orgId, name: 'Test Project' });

  projectId = projRes.body.data.id;
});

afterAll(async () => {
  await closePool();
  await closeRedis();
});

describe('POST /api/v1/issues', () => {
  it('creates an issue', async () => {
    const res = await request(app)
      .post('/api/v1/issues')
      .set('Authorization', `Bearer ${token}`)
      .send({ orgId, projectId, title: 'Test Issue Alpha', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Test Issue Alpha');
    expect(res.body.data.org_id).toBe(orgId);
  });

  it('rejects missing title', async () => {
    const res = await request(app)
      .post('/api/v1/issues')
      .set('Authorization', `Bearer ${token}`)
      .send({ orgId, projectId });

    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/v1/issues')
      .send({ orgId, projectId, title: 'Should fail' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/issues', () => {
  it('returns paginated issues', async () => {
    const res = await request(app)
      .get('/api/v1/issues')
      .set('Authorization', `Bearer ${token}`)
      .query({ orgId, projectId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/v1/issues')
      .set('Authorization', `Bearer ${token}`)
      .query({ orgId, projectId, status: 'open' });

    expect(res.status).toBe(200);
    res.body.data.forEach((issue) => {
      expect(issue.status).toBe('open');
    });
  });
});

describe('Org isolation', () => {
  it('cannot access another org issues', async () => {
    // Register a new user in a different org
    const email2 = `other_${Date.now()}@example.com`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: email2, password: 'Password123!' });

    const token2 = regRes.body.data.token;

    const orgRes2 = await request(app)
      .post('/api/v1/org')
      .set('Authorization', `Bearer ${token2}`)
      .send({ name: 'Other Org' });

    const otherOrgId = orgRes2.body.data.id;

    // Try to query issues from first org using second user's token
    const res = await request(app)
      .get('/api/v1/issues')
      .set('Authorization', `Bearer ${token2}`)
      .query({ orgId }); // Using first user's orgId

    expect(res.status).toBe(403);
  });
});
