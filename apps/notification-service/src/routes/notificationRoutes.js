'use strict';

const express = require('express');
const Notification = require('../models/Notification');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

// GET /api/v1/notifications?orgId=&userId=&limit=
router.get('/', async (req, res, next) => {
  try {
    const { orgId, userId, limit = 20, skip = 0 } = req.query;

    if (!orgId) {
      return next(new AppError('orgId is required', 400, 'VALIDATION_ERROR'));
    }

    const filter = { orgId };
    if (userId) filter.userId = userId;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Notification.countDocuments(filter);

    res.json({
      success: true,
      data: notifications,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/notifications/:id/read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!notification) {
      return next(new AppError('Notification not found', 404, 'NOT_FOUND'));
    }
    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
