'use strict';

const logger = require('@backend-platform/logger');
const { v4: uuidv4 } = require('uuid');

function requestLogger(req, res, next) {
  const requestId = uuidv4();
  req.requestId = requestId;
  const start = Date.now();

  res.on('finish', () => {
    logger.info('HTTP request', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration_ms: Date.now() - start,
      orgId: req.user?.orgId,
      userId: req.user?.userId,
    });
  });

  next();
}

module.exports = { requestLogger };
