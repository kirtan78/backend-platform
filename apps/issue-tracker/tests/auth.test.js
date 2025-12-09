'use strict';

const request = require('supertest');
const path = require('path');

// Set test env before anything loads
process.env.NODE_ENV = 'test';
process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';
process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'backend_platform_test';
process.env.POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

const app = require('../src/server');
const { query, closePool } = require('@backend-platform/db');
const { closeRedis } = require('@backend-platform/db');

beforeAll(async () => {
  // Run a quick test to ensure DB is reachable
  try {
    await query('SELECT 1');
  } catch (err) {
    console.error('Cannot connect to test DB:', err.message);
    process.exit(1);
  }
});

afterAll(async () => {
  await closePool();
  await closeRedis();
});

describe('POST /api/v1/auth/register', () => {
  const email = `test_${Date.now()}@example.com`;

  it('registers a new user and returns a token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(email);
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123!' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'Password123!' });

    expect(res.status).toBe(400);
  });

  it('rejects short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'new@example.com', password: 'short' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  const email = `login_test_${Date.now()}@example.com`;
  const password = 'Password123!';

  beforeAll(async () => {
    await request(app).post('/api/v1/auth/register').send({ email, password });
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password });

    expect(res.status).toBe(401);
  });
});
