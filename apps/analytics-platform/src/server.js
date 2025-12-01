'use strict';

const express = require('express');
const config = require('@backend-platform/config');
const logger = require('@backend-platform/logger');
const { connectMongo, closeMongo, closePool, closeRedis } = require('@backend-platform/db');
const { startEventSubscriber } = require('./events/analyticsEventSubscriber');
const { startAggregationWorker, stopAggregationWorker } = require('./workers/aggregationWorker');
const analyticsRoutes = require('./routes/analyticsRoutes');
const billingRoutes = require('./routes/billingRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'analytics-platform',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Not found', code: 'NOT_FOUND' } });
});

app.use(errorHandler);

async function start() {
  await connectMongo();

  // Start Redis event subscriber for analytics ingestion
  await startEventSubscriber();

  // Start aggregation worker
  await startAggregationWorker();

  const PORT = config.ports.analyticsPlatform;
  const server = app.listen(PORT, () => {
    logger.info('Analytics Platform started', { port: PORT });
  });

  async function shutdown(signal) {
    logger.info(`${signal} received, shutting down analytics platform...`);
    server.close(async () => {
      try {
        await stopAggregationWorker();
        await closeMongo();
        await closePool();
        await closeRedis();
        logger.info('Analytics Platform shut down cleanly');
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
}

start().catch((err) => {
  logger.error('Failed to start analytics platform', { error: err.message });
  process.exit(1);
});

module.exports = app;
