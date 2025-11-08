'use strict';

/**
 * @typedef {Object} IssueCreatedEvent
 * @property {'IssueCreated'} type
 * @property {string} orgId
 * @property {string} projectId
 * @property {string} issueId
 * @property {string} actorId
 * @property {string} timestamp
 */

/**
 * @typedef {Object} IssueUpdatedEvent
 * @property {'IssueUpdated'} type
 * @property {string} orgId
 * @property {string} projectId
 * @property {string} issueId
 * @property {string} actorId
 * @property {Object} changes
 * @property {string} timestamp
 */

/**
 * @typedef {Object} CommentAddedEvent
 * @property {'CommentAdded'} type
 * @property {string} orgId
 * @property {string} projectId
 * @property {string} issueId
 * @property {string} commentId
 * @property {string} actorId
 * @property {string} timestamp
 */

/**
 * @typedef {Object} UserInvitedEvent
 * @property {'UserInvited'} type
 * @property {string} orgId
 * @property {string} invitedUserId
 * @property {string} actorId
 * @property {string} role
 * @property {string} timestamp
 */

// Event channel names
const CHANNELS = {
  ISSUE_EVENTS: 'issue-events',
  USER_EVENTS: 'user-events',
  ANALYTICS_EVENTS: 'analytics-events',
};

// Event types
const EVENT_TYPES = {
  ISSUE_CREATED: 'IssueCreated',
  ISSUE_UPDATED: 'IssueUpdated',
  COMMENT_ADDED: 'CommentAdded',
  USER_INVITED: 'UserInvited',
};

// Job types for notification service
const JOB_TYPES = {
  SEND_EMAIL: 'send_email',
  SEND_IN_APP: 'send_in_app',
  SEND_WEBHOOK: 'send_webhook',
};

// Issue statuses
const ISSUE_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CANCELLED: 'cancelled',
};

// Issue priorities
const ISSUE_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

// Subscription plans
const PLANS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
};

// Plan limits
const PLAN_LIMITS = {
  free: { maxProjects: 3, maxMembers: 5, aiSummarization: false },
  pro: { maxProjects: 20, maxMembers: 50, aiSummarization: true },
  enterprise: { maxProjects: Infinity, maxMembers: Infinity, aiSummarization: true },
};

/**
 * Build a standard event payload
 */
function buildEvent(type, data) {
  return {
    type,
    timestamp: new Date().toISOString(),
    ...data,
  };
}

module.exports = {
  CHANNELS,
  EVENT_TYPES,
  JOB_TYPES,
  ISSUE_STATUS,
  ISSUE_PRIORITY,
  PLANS,
  PLAN_LIMITS,
  buildEvent,
};
