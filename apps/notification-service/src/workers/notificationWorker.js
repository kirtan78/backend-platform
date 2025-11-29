'use strict';

const { Worker } = require('bullmq');
const config = require('@backend-platform/config');
const logger = require('@backend-platform/logger');
const Job = require('../models/Job');
const DeadLetter = require('../models/DeadLetter');
const Notification = require('../models/Notification');

const QUEUE_NAME = 'notifications';
let worker = null;

const CONNECTION = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: null,
};

/**
 * Process a send_email job (mocked — logs only)
 */
async function processEmailJob(payload) {
  logger.info('Sending email notification (mocked)', {
    to: payload.recipientEmail,
    subject: payload.title,
    eventType: payload.eventType,
  });

  // In production: call SES, SendGrid, etc.
  await new Promise((resolve) => setTimeout(resolve, 50));

  return { delivered: true, channel: 'email', to: payload.recipientEmail };
}

/**
 * Process a send_in_app job — stores notification in MongoDB
 */
async function processInAppJob(payload) {
  const notification = await Notification.create({
    orgId: payload.orgId,
    userId: payload.userId,
    type: 'in_app',
    eventType: payload.eventType,
    title: payload.title,
    body: payload.body,
    metadata: payload.metadata || {},
    deliveredAt: new Date(),
  });

  logger.info('In-app notification stored', { notificationId: notification._id.toString() });
  return { delivered: true, channel: 'in_app', notificationId: notification._id };
}

/**
 * Process a send_webhook job — mocked HTTP delivery
 */
async function processWebhookJob(payload) {
  logger.info('Delivering webhook (mocked)', {
    targetUrl: payload.targetUrl,
    eventType: payload.eventType,
  });

  // In production: make HTTP POST with signature, handle response codes
  await new Promise((resolve) => setTimeout(resolve, 100));

  return { delivered: true, channel: 'webhook', targetUrl: payload.targetUrl };
}

/**
 * Main BullMQ job processor
 */
async function processJob(bullmqJob) {
  const { name: jobType, data: payload } = bullmqJob;
  logger.info('Processing job', { jobId: bullmqJob.id, type: jobType, attempt: bullmqJob.attemptsMade + 1 });

  // Track job state in MongoDB
  let mongoJob = await Job.findOne({ bullmqJobId: bullmqJob.id });
  if (!mongoJob) {
    mongoJob = await Job.create({
      type: jobType,
      status: 'processing',
      payload,
      bullmqJobId: bullmqJob.id,
      attempts: bullmqJob.attemptsMade + 1,
      processedAt: new Date(),
    });
  } else {
    mongoJob.status = 'processing';
    mongoJob.attempts = bullmqJob.attemptsMade + 1;
    mongoJob.processedAt = new Date();
    await mongoJob.save();
  }

  let result;
  switch (jobType) {
    case 'send_email':
      result = await processEmailJob(payload);
      break;
    case 'send_in_app':
      result = await processInAppJob(payload);
      break;
    case 'send_webhook':
      result = await processWebhookJob(payload);
      break;
    default:
      throw new Error(`Unknown job type: ${jobType}`);
  }

  mongoJob.status = 'completed';
  mongoJob.completedAt = new Date();
  await mongoJob.save();

  return result;
}

/**
 * Handle permanently failed jobs → move to dead letter queue
 */
async function handleFailedJob(bullmqJob, error) {
  const isExhausted = bullmqJob.attemptsMade >= (bullmqJob.opts.attempts || 3);
  if (!isExhausted) return;

  logger.error('Job permanently failed, moving to dead letter queue', {
    jobId: bullmqJob.id,
    type: bullmqJob.name,
    error: error.message,
    attempts: bullmqJob.attemptsMade,
  });

  // Update MongoDB job status
  await Job.findOneAndUpdate(
    { bullmqJobId: bullmqJob.id },
    { status: 'dead', lastError: error.message },
    { upsert: false }
  );

  // Move to dead letter collection
  await DeadLetter.create({
    originalJobId: bullmqJob.id,
    jobType: bullmqJob.name,
    payload: bullmqJob.data,
    errorHistory: [{
      attempt: bullmqJob.attemptsMade,
      error: error.message,
      failedAt: new Date(),
    }],
    reason: 'Max retry attempts exhausted',
  });
}

/**
 * Start the BullMQ worker
 */
async function startWorker() {
  worker = new Worker(QUEUE_NAME, processJob, {
    connection: CONNECTION,
    concurrency: 5,
  });

  worker.on('completed', (job, result) => {
    logger.info('Job completed', { jobId: job.id, type: job.name, result });
  });

  worker.on('failed', async (job, error) => {
    logger.error('Job failed', {
      jobId: job.id,
      type: job.name,
      error: error.message,
      attempt: job.attemptsMade,
    });
    await handleFailedJob(job, error).catch((err) =>
      logger.error('Error moving to DLQ', { error: err.message })
    );
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
  });

  logger.info('BullMQ notification worker started', { concurrency: 5 });
  return worker;
}

/**
 * Stop the BullMQ worker
 */
async function stopWorker() {
  if (worker) {
    await worker.close();
    worker = null;
    logger.info('BullMQ worker stopped');
  }
}

module.exports = { startWorker, stopWorker };
