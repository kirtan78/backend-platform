'use strict';

const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'error' : 'info');

/**
 * Format a log entry as structured JSON
 */
function formatEntry(level, message, meta = {}) {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  });
}

/**
 * Core log function
 */
function log(level, message, meta = {}) {
  if (LOG_LEVELS[level] > LOG_LEVELS[currentLevel]) return;
  const entry = formatEntry(level, message, meta);
  if (level === 'error') {
    process.stderr.write(entry + '\n');
  } else {
    process.stdout.write(entry + '\n');
  }
}

/**
 * Create a child logger with pre-bound context
 * @param {Object} context - Fields to include in every log entry
 */
function createLogger(context = {}) {
  return {
    error: (message, meta = {}) => log('error', message, { ...context, ...meta }),
    warn: (message, meta = {}) => log('warn', message, { ...context, ...meta }),
    info: (message, meta = {}) => log('info', message, { ...context, ...meta }),
    debug: (message, meta = {}) => log('debug', message, { ...context, ...meta }),
    child: (childContext = {}) => createLogger({ ...context, ...childContext }),
  };
}

const logger = createLogger({ service: 'backend-platform' });

module.exports = logger;
module.exports.createLogger = createLogger;
