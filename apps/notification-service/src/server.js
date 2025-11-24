'use strict';

const express = require('express');
const config = require('@backend-platform/config');
const logger = require('@backend-platform/logger');
const { connectMongo, closeMongo } = require('@backend-platform/db');
const { closeRedis } = require('@backend-platform/db');
const { startEventSubscriber } = require('./events/eventSubscriber');
const { getNotificationQueue, closeQueues } = require('./queues/notificationQueue');
const { startWorker, stopWorker } = require('./workers/notificationWorker');
const notificationRoutes = require('./routes/notificationRoutes');
const jobRoutes = require('./routes/jobRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'notification-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/jobs', jobRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Not found', code: 'NOT_FOUND' } });
});

app.use(errorHandler);

async function start() {
  await connectMongo();
  logger.info('MongoDB connected for notification service');

  // Start Redis event subscriber
  await startEventSubscriber();

  // Start BullMQ worker
  await startWorker();

  const PORT = config.ports.notificationService;
  const server = app.listen(PORT, () => {
    logger.info('Notification Service started', { port: PORT });
  });

  async function shutdown(signal) {
    logger.info(`${signal} received, shutting down notification service...`);
    server.close(async () => {
      try {
        await stopWorker();
        await closeQueues();
        await closeMongo();
        await closeRedis();
        logger.info('Notification Service shut down cleanly');
        process.exit(0);
      } catch (err) {
        logger.error('Shutdown error', { error: err.message });
        process.exit(1);
      }
    });
    setTimeout(() => process.exit(1), 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

start().catch((err) => {
  logger.error('Failed to start notification service', { error: err.message });
  process.exit(1);
});

module.exports = app;
