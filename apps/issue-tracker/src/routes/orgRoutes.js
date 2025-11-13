'use strict';

const express = require('express');
const Joi = require('joi');
const orgController = require('../controllers/orgController');
const { authenticate } = require('@backend-platform/auth');
const { requireRole } = require('@backend-platform/auth');
const { validateBody } = require('../middleware/validate');
const { loadOrgMembership } = require('../middleware/orgScope');

const router = express.Router();

const createOrgSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
});

const inviteSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid('admin', 'member').default('member'),
  orgId: Joi.string().uuid().required(),
});

router.post('/', authenticate, validateBody(createOrgSchema), orgController.createOrg);
router.post('/invite', authenticate, validateBody(inviteSchema), loadOrgMembership, requireRole('admin'), orgController.inviteUser);
router.get('/members', authenticate, loadOrgMembership, orgController.getMembers);
router.get('/', authenticate, orgController.getUserOrgs);

module.exports = router;
