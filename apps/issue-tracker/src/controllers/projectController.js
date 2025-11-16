'use strict';

const projectService = require('../services/projectService');

async function createProject(req, res, next) {
  try {
    const project = await projectService.createProject({
      orgId: req.body.orgId,
      name: req.body.name,
      createdBy: req.user.userId,
    });
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

async function listProjects(req, res, next) {
  try {
    const projects = await projectService.listProjects({ orgId: req.query.orgId });
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
}

module.exports = { createProject, listProjects };
