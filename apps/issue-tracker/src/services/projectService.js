'use strict';

const { AppError } = require('../middleware/errorHandler');
const projectRepository = require('../repositories/projectRepository');
const orgRepository = require('../repositories/orgRepository');

async function createProject({ orgId, name, createdBy }) {
  const org = await orgRepository.findById(orgId);
  if (!org) {
    throw new AppError('Organization not found', 404, 'NOT_FOUND');
  }
  return projectRepository.create({ orgId, name, createdBy });
}

async function listProjects({ orgId }) {
  return projectRepository.listByOrg({ orgId });
}

module.exports = { createProject, listProjects };
