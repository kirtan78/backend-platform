'use strict';

const postgres = require('./postgres');
const mongo = require('./mongo');
const redis = require('./redis');

module.exports = {
  // Postgres
  query: postgres.query,
  getPool: postgres.getPool,
  getClient: postgres.getClient,
  closePool: postgres.closePool,

  // MongoDB
  connectMongo: mongo.connectMongo,
  closeMongo: mongo.closeMongo,
  mongoose: mongo.mongoose,

  // Redis
  getRedisClient: redis.getRedisClient,
  getRedisSubscriber: redis.getRedisSubscriber,
  getRedisPublisher: redis.getRedisPublisher,
  publishEvent: redis.publishEvent,
  subscribeToChannel: redis.subscribeToChannel,
  closeRedis: redis.closeRedis,
};
