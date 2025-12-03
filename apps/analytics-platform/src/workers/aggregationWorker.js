'use strict';

const logger = require('@backend-platform/logger');
const { getRedisClient } = require('@backend-platform/db');
const RawEvent = require('../models/RawEvent');
const MetricSnapshot = require('../models/MetricSnapshot');

let aggregationInterval = null;
const INTERVAL_MS = 60 * 1000; // Run every 60 seconds

/**
 * Compute metrics for a given date and org
 */
async function computeMetricsForDate(orgId, dateStr) {
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  const events = await RawEvent.find({
    orgId,
    receivedAt: { $gte: startOfDay, $lte: endOfDay },
  });

  // DAU = unique actorIds for that day
  const uniqueActors = new Set(events.filter((e) => e.actorId).map((e) => e.actorId));

  // Event counts by type
  const eventCounts = {};
  for (const event of events) {
    eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
  }

  return {
    dau: uniqueActors.size,
    eventCounts,
    totalEvents: events.length,
  };
}

/**
 * Run aggregation for all orgs for today and yesterday
 */
async function runAggregation() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Get distinct orgIds from recent events
    const orgIds = await RawEvent.distinct('orgId', {
      receivedAt: { $gte: new Date(Date.now() - 48 * 3600 * 1000) },
    });

    if (orgIds.length === 0) {
      logger.debug('No orgs to aggregate');
      return;
    }

    const redis = getRedisClient();

    for (const orgId of orgIds) {
      for (const dateStr of [today, yesterday]) {
        const metrics = await computeMetricsForDate(orgId, dateStr);

        // Upsert metric snapshot in MongoDB
        await MetricSnapshot.findOneAndUpdate(
          { orgId, date: dateStr },
          { ...metrics, computedAt: new Date() },
          { upsert: true, new: true }
        );

        // Cache in Redis (5 min TTL)
        const cacheKey = `metrics:${orgId}:${dateStr}`;
        await redis.setex(cacheKey, 300, JSON.stringify(metrics));
      }
    }

    logger.info('Aggregation complete', { orgsProcessed: orgIds.length });
  } catch (err) {
    logger.error('Aggregation worker error', { error: err.message });
  }
}

async function startAggregationWorker() {
  // Run immediately on start
  await runAggregation();
  // Then run on interval
  aggregationInterval = setInterval(runAggregation, INTERVAL_MS);
  logger.info('Aggregation worker started', { intervalMs: INTERVAL_MS });
}

async function stopAggregationWorker() {
  if (aggregationInterval) {
    clearInterval(aggregationInterval);
    aggregationInterval = null;
    logger.info('Aggregation worker stopped');
  }
}

module.exports = { startAggregationWorker, stopAggregationWorker, runAggregation };
