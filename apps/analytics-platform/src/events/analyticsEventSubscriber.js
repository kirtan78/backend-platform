'use strict';

const { subscribeToChannel } = require('@backend-platform/db');
const { CHANNELS } = require('@backend-platform/types');
const logger = require('@backend-platform/logger');
const RawEvent = require('../models/RawEvent');

/**
 * Ingest an event into the raw_events collection
 */
async function ingestEvent(payload) {
  try {
    await RawEvent.create({
      type: payload.type,
      orgId: payload.orgId,
      actorId: payload.actorId,
      projectId: payload.projectId,
      issueId: payload.issueId,
      payload,
      receivedAt: new Date(payload.timestamp || Date.now()),
    });
    logger.debug('Analytics event ingested', { type: payload.type, orgId: payload.orgId });
  } catch (err) {
    logger.error('Failed to ingest analytics event', { error: err.message, type: payload.type });
  }
}

/**
 * Start subscribing to all platform event channels
 */
async function startEventSubscriber() {
  await subscribeToChannel(CHANNELS.ISSUE_EVENTS, ingestEvent);
  logger.info('Analytics event subscriber started');
}

module.exports = { startEventSubscriber };
