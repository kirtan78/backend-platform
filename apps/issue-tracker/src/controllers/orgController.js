'use strict';

const orgService = require('../services/orgService');

async function createOrg(req, res, next) {
  try {
    const org = await orgService.createOrg({ name: req.body.name, userId: req.user.userId });
    res.status(201).json({ success: true, data: org });
  } catch (err) {
    next(err);
  }
}

async function inviteUser(req, res, next) {
  try {
    const result = await orgService.inviteUser({
      orgId: req.body.orgId,
      email: req.body.email,
      role: req.body.role,
      actorId: req.user.userId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getMembers(req, res, next) {
  try {
    const members = await orgService.getMembers({ orgId: req.user.orgId });
    res.json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
}

async function getUserOrgs(req, res, next) {
  try {
    const orgs = await orgService.getUserOrgs({ userId: req.user.userId });
    res.json({ success: true, data: orgs });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrg, inviteUser, getMembers, getUserOrgs };
