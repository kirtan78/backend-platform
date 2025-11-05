'use strict';

const Redis = require('ioredis');
const config = require('@backend-platform/config');
const logger = require('@backend-platform/logger');

let client = null;
let subscriber = null;
let publisher = null;

function createRedisClient(name = 'client') {
  const redisConfig = {
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  };

  if (config.redis.password) {
    redisConfig.password = config.redis.password;
  }

  const instance = new Redis(redisConfig);

  instance.on('connect', () => logger.info(`Redis ${name} connected`));
  instance.on('error', (err) => logger.error(`Redis ${name} error`, { error: err.message }));
  instance.on('close', () => logger.warn(`Redis ${name} connection closed`));

  return instance;
}

/**
 * Get the main Redis client (for get/set/del operations)
 */
function getRedisClient() {
  if (!client) {
    client = createRedisClient('client');
  }
  return client;
}

/**
 * Get a dedicated subscriber client (cannot run regular commands while subscribed)
 */
function getRedisSubscriber() {
  if (!subscriber) {
    subscriber = createRedisClient('subscriber');
  }
  return subscriber;
}

/**
 * Get a dedicated publisher client
 */
function getRedisPublisher() {
  if (!publisher) {
    publisher = createRedisClient('publisher');
  }
  return publisher;
}

/**
 * Publish an event to a Redis channel
 * @param {string} channel - Channel name
 * @param {Object} payload - Event payload (will be JSON serialized)
 */
async function publishEvent(channel, payload) {
  const pub = getRedisPublisher();
  const message = JSON.stringify(payload);
  await pub.publish(channel, message);
  logger.debug('Event published', { channel, type: payload.type });
}

/**
 * Subscribe to a Redis channel
 * @param {string} channel - Channel name
 * @param {Function} handler - Async handler(payload) function
 */
async function subscribeToChannel(channel, handler) {
  const sub = getRedisSubscriber();
  await sub.subscribe(channel);

  sub.on('message', async (ch, message) => {
    if (ch !== channel) return;
    try {
      const payload = JSON.parse(message);
      await handler(payload);
    } catch (err) {
      logger.error('Error handling Redis message', { channel, error: err.message });
    }
  });

  logger.info('Subscribed to Redis channel', { channel });
}

/**
 * Close all Redis connections — call on graceful shutdown
 */
async function closeRedis() {
  const connections = [client, subscriber, publisher].filter(Boolean);
  await Promise.all(connections.map((c) => c.quit()));
  client = null;
  subscriber = null;
  publisher = null;
  logger.info('Redis connections closed');
}

module.exports = {
  getRedisClient,
  getRedisSubscriber,
  getRedisPublisher,
  publishEvent,
  subscribeToChannel,
  closeRedis,
};
