'use strict';

const express = require('express');
const config = require('@backend-platform/config');
const logger = require('@backend-platform/logger');
const { closePool, closeRedis } = require('@backend-platform/db');

const authRoutes = require('./routes/authRoutes');
const orgRoutes = require('./routes/orgRoutes');
const projectRoutes = require('./routes/projectRoutes');
const issueRoutes = require('./routes/issueRoutes');
const seedRoutes = require('./routes/seedRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

const app = express();

app.use(express.json());
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'issue-tracker',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/org', orgRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/issues', issueRoutes);
app.use('/seed', seedRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  });
});

// Global error handler
app.use(errorHandler);

// Only start listening when run directly (not when required by tests)
if (require.main === module) {
  const PORT = config.ports.issueTracker;
  const server = app.listen(PORT, () => {
    logger.info('Issue Tracker started', { port: PORT, env: config.env });
  });

  // Graceful shutdown
  async function shutdown(signal) {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      try {
        await closePool();
        await closeRedis();
        logger.info('Issue Tracker shut down cleanly');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', { error: err.message });
        process.exit(1);
      }
    });
    // Force exit after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
