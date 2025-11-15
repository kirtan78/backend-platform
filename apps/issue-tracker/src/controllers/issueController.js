'use strict';

const issueService = require('../services/issueService');

async function createIssue(req, res, next) {
  try {
    const issue = await issueService.createIssue({
      ...req.body,
      createdBy: req.user.userId,
    });
    res.status(201).json({ success: true, data: issue });
  } catch (err) {
    next(err);
  }
}

async function listIssues(req, res, next) {
  try {
    const result = await issueService.listIssues(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

async function updateIssue(req, res, next) {
  try {
    const issue = await issueService.updateIssue({
      issueId: req.params.id,
      updates: req.body,
      actorId: req.user.userId,
      orgId: req.body.orgId,
    });
    res.json({ success: true, data: issue });
  } catch (err) {
    next(err);
  }
}

async function addComment(req, res, next) {
  try {
    const comment = await issueService.addComment({
      issueId: req.params.id,
      orgId: req.body.orgId,
      userId: req.user.userId,
      content: req.body.content,
    });
    res.status(201).json({ success: true, data: comment });
  } catch (err) {
    next(err);
  }
}

async function summarizeIssue(req, res, next) {
  try {
    const result = await issueService.summarizeIssue({
      issueId: req.params.id,
      orgId: req.body.orgId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function getActivity(req, res, next) {
  try {
    const orgId = req.query.orgId || req.user.orgId;
    const activity = await issueService.getActivity({ issueId: req.params.id, orgId });
    res.json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
}

module.exports = { createIssue, listIssues, updateIssue, addComment, summarizeIssue, getActivity };
