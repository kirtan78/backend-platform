'use strict';

const express = require('express');
const { getRedisClient } = require('@backend-platform/db');
const MetricSnapshot = require('../models/MetricSnapshot');
const RawEvent = require('../models/RawEvent');
const { AppError } = require('../middleware/errorHandler');
const { runAggregation } = require('../workers/aggregationWorker');

const router = express.Router();

// GET /api/v1/analytics/metrics?orgId=&date=
router.get('/metrics', async (req, res, next) => {
  try {
    const { orgId, date } = req.query;
    if (!orgId) return next(new AppError('orgId required', 400, 'VALIDATION_ERROR'));

    const dateStr = date || new Date().toISOString().split('T')[0];
    const redis = getRedisClient();
    const cacheKey = `metrics:${orgId}:${dateStr}`;

    // Try cache first
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) {
      return res.json({ success: true, data: JSON.parse(cached), source: 'cache' });
    }

    // Fall back to MongoDB
    const snapshot = await MetricSnapshot.findOne({ orgId, date: dateStr });
    if (!snapshot) {
      return res.json({
        success: true,
        data: { dau: 0, eventCounts: {}, totalEvents: 0, date: dateStr },
        source: 'db',
      });
    }

    const data = {
      date: snapshot.date,
      dau: snapshot.dau,
      eventCounts: Object.fromEntries(snapshot.eventCounts),
      totalEvents: snapshot.totalEvents,
      computedAt: snapshot.computedAt,
    };

    await redis.setex(cacheKey, 300, JSON.stringify(data)).catch(() => {});

    res.json({ success: true, data, source: 'db' });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/events?orgId=&type=&limit=
router.get('/events', async (req, res, next) => {
  try {
    const { orgId, type, limit = 50 } = req.query;
    if (!orgId) return next(new AppError('orgId required', 400, 'VALIDATION_ERROR'));

    const filter = { orgId };
    if (type) filter.type = type;

    const events = await RawEvent.find(filter)
      .sort({ receivedAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/analytics/aggregate - manually trigger aggregation
router.post('/aggregate', async (req, res, next) => {
  try {
    await runAggregation();
    res.json({ success: true, data: { message: 'Aggregation triggered successfully' } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/analytics/dau-history?orgId=&days=7
router.get('/dau-history', async (req, res, next) => {
  try {
    const { orgId, days = 7 } = req.query;
    if (!orgId) return next(new AppError('orgId required', 400, 'VALIDATION_ERROR'));

    const snapshots = await MetricSnapshot.find({ orgId })
      .sort({ date: -1 })
      .limit(parseInt(days));

    res.json({ success: true, data: snapshots.map((s) => ({
      date: s.date,
      dau: s.dau,
      totalEvents: s.totalEvents,
    }))});
  } catch (err) {
    next(err);
  }
});

module.exports = router;
