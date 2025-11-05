'use strict';

const mongoose = require('mongoose');
const config = require('@backend-platform/config');
const logger = require('@backend-platform/logger');

let connected = false;

/**
 * Connect to MongoDB
 */
async function connectMongo() {
  if (connected) return;

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected', { uri: config.mongo.uri.replace(/:\/\/.*@/, '://***@') });
    connected = true;
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
    connected = false;
  });

  await mongoose.connect(config.mongo.uri, {
    maxPoolSize: 10,
  });
}

/**
 * Disconnect from MongoDB — call on graceful shutdown
 */
async function closeMongo() {
  if (connected) {
    await mongoose.disconnect();
    connected = false;
    logger.info('MongoDB disconnected cleanly');
  }
}

module.exports = { connectMongo, closeMongo, mongoose };
