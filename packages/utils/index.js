'use strict';

const crypto = require('crypto');

/**
 * Encode a cursor for pagination (base64 encoding of JSON)
 * @param {Object} data - Cursor data (e.g., { id, createdAt })
 */
function encodeCursor(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decode a pagination cursor
 * @param {string} cursor - Base64 encoded cursor string
 */
function decodeCursor(cursor) {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

/**
 * Build a paginated response object
 * @param {Array} items - The page of items
 * @param {number} limit - Page size requested
 * @param {Function} cursorFn - Function to extract cursor from last item
 */
function buildPaginatedResponse(items, limit, cursorFn) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, -1) : items;
  const lastItem = data[data.length - 1];
  const nextCursor = hasMore && lastItem ? encodeCursor(cursorFn(lastItem)) : null;

  return {
    data,
    pagination: {
      nextCursor,
      hasMore,
      count: data.length,
    },
  };
}

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} opts - { maxAttempts, baseDelayMs, factor }
 */
async function withRetry(fn, opts = {}) {
  const { maxAttempts = 3, baseDelayMs = 1000, factor = 4 } = opts;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(factor, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Generate a HMAC-SHA256 signature for webhook verification
 * @param {string} payload - Raw request body
 * @param {string} secret - Webhook secret
 */
function generateWebhookSignature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify a webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Signature from request header
 * @param {string} secret - Webhook secret
 */
function verifyWebhookSignature(payload, signature, secret) {
  const expected = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Omit keys from an object
 * @param {Object} obj
 * @param {string[]} keys
 */
function omit(obj, keys) {
  const result = { ...obj };
  keys.forEach((k) => delete result[k]);
  return result;
}

/**
 * Pick keys from an object
 * @param {Object} obj
 * @param {string[]} keys
 */
function pick(obj, keys) {
  const result = {};
  keys.forEach((k) => { if (k in obj) result[k] = obj[k]; });
  return result;
}

/**
 * Format a date to ISO string, returning null for falsy values
 * @param {Date|string|null} date
 */
function formatDate(date) {
  if (!date) return null;
  return new Date(date).toISOString();
}

module.exports = {
  encodeCursor,
  decodeCursor,
  buildPaginatedResponse,
  sleep,
  withRetry,
  generateWebhookSignature,
  verifyWebhookSignature,
  omit,
  pick,
  formatDate,
};
