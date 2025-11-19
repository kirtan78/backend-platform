'use strict';

const express = require('express');
const config = require('@backend-platform/config');
const { AppError } = require('../middleware/errorHandler');
const seedController = require('../controllers/seedController');

const router = express.Router();

router.post('/demo', async (req, res, next) => {
  const secret = req.headers['x-seed-secret'];
  if (secret !== config.seedSecret) {
    return next(new AppError('Invalid seed secret', 403, 'FORBIDDEN'));
  }
  return seedController.runSeed(req, res, next);
});

module.exports = router;
