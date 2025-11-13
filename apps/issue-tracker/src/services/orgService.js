'use strict';

const { publishEvent, getRedisClient } = require('@backend-platform/db');
const { buildEvent, EVENT_TYPES, CHANNELS } = require('@backend-platform/types');
const { AppError } = require('../middleware/errorHandler');
const orgRepository = require('../repositories/orgRepository');
const userRepository = require('../repositories/userRepository');
const logger = require('@backend-platform/logger');

async function createOrg({ name, userId }) {
  const org = await orgRepository.create({ name });
  await orgRepository.addMember({ orgId: org.id, userId, role: 'admin' });
  return org;
}

async function inviteUser({ orgId, email, role, actorId }) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AppError('User not found. They must register first.', 404, 'NOT_FOUND');
  }

  const existing = await orgRepository.getMember({ orgId, userId: user.id });
  if (existing) {
    throw new AppError('User is already a member of this organization', 409, 'CONFLICT');
  }

  const membership = await orgRepository.addMember({ orgId, userId: user.id, role });

  // Publish UserInvited event
  await publishEvent(CHANNELS.ISSUE_EVENTS, buildEvent(EVENT_TYPES.USER_INVITED, {
    orgId,
    invitedUserId: user.id,
    actorId,
    role,
  })).catch((err) => logger.error('Failed to publish UserInvited event', { error: err.message }));

  // Invalidate org members cache
  const redis = getRedisClient();
  await redis.del(`org:${orgId}:members`).catch(() => {});

  return { member: { userId: user.id, email: user.email, role: membership.role } };
}

async function getMembers({ orgId }) {
  const redis = getRedisClient();
  const cacheKey = `org:${orgId}:members`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    return JSON.parse(cached);
  }

  const members = await orgRepository.getMembers({ orgId });

  await redis.setex(cacheKey, 300, JSON.stringify(members)).catch(() => {});

  return members;
}

async function getUserOrgs({ userId }) {
  return orgRepository.getUserOrgs({ userId });
}

module.exports = { createOrg, inviteUser, getMembers, getUserOrgs };
