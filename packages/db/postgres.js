'use strict';

const { Pool } = require('pg');
const config = require('@backend-platform/config');
const logger = require('@backend-platform/logger');

let pool = null;

/**
 * Get or create the Postgres connection pool
 */
function getPool() {
  if (!pool) {
    pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      logger.error('Postgres pool error', { error: err.message });
    });

    logger.info('Postgres pool created', {
      host: config.postgres.host,
      database: config.postgres.database,
    });
  }
  return pool;
}

/**
 * Execute a query against the Postgres pool
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 */
async function query(text, params) {
  const pg = getPool();
  const start = Date.now();
  const result = await pg.query(text, params);
  const duration = Date.now() - start;
  logger.debug('Postgres query', { duration_ms: duration, rows: result.rowCount });
  return result;
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
  const pg = getPool();
  return pg.connect();
}

/**
 * Close the pool — call on graceful shutdown
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Postgres pool closed');
  }
}

module.exports = { query, getPool, getClient, closePool };
