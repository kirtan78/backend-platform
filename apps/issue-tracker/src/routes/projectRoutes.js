'use strict';

const express = require('express');
const Joi = require('joi');
const projectController = require('../controllers/projectController');
const { authenticate } = require('@backend-platform/auth');
const { validateBody, validateQuery } = require('../middleware/validate');
const { loadOrgMembership } = require('../middleware/orgScope');

const router = express.Router();

const createProjectSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  orgId: Joi.string().uuid().required(),
});

const listProjectsSchema = Joi.object({
  orgId: Joi.string().uuid().required(),
});

router.post('/', authenticate, validateBody(createProjectSchema), loadOrgMembership, projectController.createProject);
router.get('/', authenticate, validateQuery(listProjectsSchema), loadOrgMembership, projectController.listProjects);

module.exports = router;
