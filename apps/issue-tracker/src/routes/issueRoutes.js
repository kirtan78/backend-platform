'use strict';

const express = require('express');
const Joi = require('joi');
const issueController = require('../controllers/issueController');
const { authenticate } = require('@backend-platform/auth');
const { validateBody, validateQuery } = require('../middleware/validate');
const { loadOrgMembership } = require('../middleware/orgScope');

const router = express.Router();

const createIssueSchema = Joi.object({
  orgId: Joi.string().uuid().required(),
  projectId: Joi.string().uuid().required(),
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(5000).allow('').default(''),
  status: Joi.string().valid('open', 'in_progress', 'done', 'cancelled').default('open'),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  assigneeId: Joi.string().uuid().allow(null).default(null),
});

const updateIssueSchema = Joi.object({
  orgId: Joi.string().uuid().required(),
  title: Joi.string().min(3).max(255),
  description: Joi.string().max(5000).allow(''),
  status: Joi.string().valid('open', 'in_progress', 'done', 'cancelled'),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  assigneeId: Joi.string().uuid().allow(null),
}).min(2);

const listIssuesSchema = Joi.object({
  orgId: Joi.string().uuid().required(),
  projectId: Joi.string().uuid(),
  status: Joi.string().valid('open', 'in_progress', 'done', 'cancelled'),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  assigneeId: Joi.string().uuid(),
  cursor: Joi.string(),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const addCommentSchema = Joi.object({
  orgId: Joi.string().uuid().required(),
  content: Joi.string().min(1).max(5000).required(),
});

const summarizeSchema = Joi.object({
  orgId: Joi.string().uuid().required(),
});

router.post('/', authenticate, validateBody(createIssueSchema), loadOrgMembership, issueController.createIssue);
router.get('/', authenticate, validateQuery(listIssuesSchema), loadOrgMembership, issueController.listIssues);
router.patch('/:id', authenticate, validateBody(updateIssueSchema), loadOrgMembership, issueController.updateIssue);
router.post('/:id/comments', authenticate, validateBody(addCommentSchema), loadOrgMembership, issueController.addComment);
router.post('/:id/summarize', authenticate, validateBody(summarizeSchema), loadOrgMembership, issueController.summarizeIssue);
router.get('/:id/activity', authenticate, loadOrgMembership, issueController.getActivity);

module.exports = router;
