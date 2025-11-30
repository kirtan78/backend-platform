'use strict';

const express = require('express');
const Job = require('../models/Job');
const DeadLetter = require('../models/DeadLetter');
const { getNotificationQueue } = require('../queues/notificationQueue');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/v1/jobs - list jobs with optional status filter
router.get('/', async (req, res, next) => {
  try {
    const { status, limit = 20, skip = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Job.countDocuments(filter);

    res.json({
      success: true,
      data: jobs,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/jobs/dead-letters - list dead letter queue
router.get('/dead-letters', async (req, res, next) => {
  try {
    const { limit = 20, skip = 0 } = req.query;
    const deadLetters = await DeadLetter.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    const total = await DeadLetter.countDocuments();
    res.json({ success: true, data: deadLetters, pagination: { total } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/jobs/queue-stats - BullMQ queue stats
router.get('/queue-stats', async (req, res, next) => {
  try {
    const queue = getNotificationQueue();
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    res.json({
      success: true,
      data: { waiting, active, completed, failed, delayed },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
