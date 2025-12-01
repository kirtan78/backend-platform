'use strict';

const logger = require('@backend-platform/logger');

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.isOperational = true;
  }
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.isOperational ? err.message : 'Internal server error';
  if (!err.isOperational) {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
  }
  res.status(statusCode).json({ success: false, error: { message, code } });
}

module.exports = { AppError, errorHandler };
