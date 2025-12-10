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
const { closePool, closeRedis } = require('@backend-platform/db');

let adminToken;
let memberToken;
let orgId;

beforeAll(async () => {
  const adminEmail = `admin_${Date.now()}@example.com`;
  const memberEmail = `member_${Date.now()}@example.com`;

  const adminReg = await request(app).post('/api/v1/auth/register').send({ email: adminEmail, password: 'Password123!' });
  adminToken = adminReg.body.data.token;

  await request(app).post('/api/v1/auth/register').send({ email: memberEmail, password: 'Password123!' });

  const orgRes = await request(app)
    .post('/api/v1/org')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'RBAC Test Org' });

  orgId = orgRes.body.data.id;

  // Invite member
  await request(app)
    .post('/api/v1/org/invite')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ orgId, email: memberEmail, role: 'member' });

  const memberLogin = await request(app).post('/api/v1/auth/login').send({ email: memberEmail, password: 'Password123!' });
  memberToken = memberLogin.body.data.token;
});

afterAll(async () => {
  await closePool();
  await closeRedis();
});

describe('Organization RBAC', () => {
  it('admin can invite users', async () => {
    const newEmail = `invite_target_${Date.now()}@example.com`;
    await request(app).post('/api/v1/auth/register').send({ email: newEmail, password: 'Password123!' });

    const res = await request(app)
      .post('/api/v1/org/invite')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ orgId, email: newEmail, role: 'member' });

    expect(res.status).toBe(201);
  });

  it('member cannot invite users', async () => {
    const newEmail = `cant_invite_${Date.now()}@example.com`;
    await request(app).post('/api/v1/auth/register').send({ email: newEmail, password: 'Password123!' });

    const res = await request(app)
      .post('/api/v1/org/invite')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ orgId, email: newEmail, role: 'member' });

    expect(res.status).toBe(403);
  });

  it('returns org members list', async () => {
    const res = await request(app)
      .get('/api/v1/org/members')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ orgId });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
