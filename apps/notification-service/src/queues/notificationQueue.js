'use strict';

const { Queue, QueueEvents } = require('bullmq');
const config = require('@backend-platform/config');
const logger = require('@backend-platform/logger');

const QUEUE_NAME = 'notifications';
let notificationQueue = null;
let queueEvents = null;

const CONNECTION = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: null,
};

/**
 * Get or create the BullMQ notification queue
 */
function getNotificationQueue() {
  if (!notificationQueue) {
    notificationQueue = new Queue(QUEUE_NAME, {
      connection: CONNECTION,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    });

    notificationQueue.on('error', (err) => {
      logger.error('BullMQ Queue error', { error: err.message });
    });

    logger.info('BullMQ notification queue initialized');
  }
  return notificationQueue;
}

/**
 * Enqueue a notification job
 * @param {string} type - Job type (send_email, send_in_app, send_webhook)
 * @param {Object} payload - Job data
 */
async function enqueueNotification(type, payload) {
  const queue = getNotificationQueue();
  const job = await queue.add(type, payload, {
    jobId: `${type}-${payload.eventId || Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
  logger.info('Job enqueued', { jobId: job.id, type });
  return job;
}

/**
 * Close BullMQ queue connections
 */
async function closeQueues() {
  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = null;
  }
  if (queueEvents) {
    await queueEvents.close();
    queueEvents = null;
  }
  logger.info('BullMQ queues closed');
}

module.exports = { getNotificationQueue, enqueueNotification, closeQueues };
