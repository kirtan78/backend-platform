'use strict';

const express = require('express');
const { query } = require('@backend-platform/db');
const { PLAN_LIMITS } = require('@backend-platform/types');
const { AppError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET /api/v1/subscriptions?orgId= - Get org subscription
router.get('/', async (req, res, next) => {
  try {
    const { orgId } = req.query;
    if (!orgId) return next(new AppError('orgId required', 400, 'VALIDATION_ERROR'));

    const result = await query(
      "SELECT * FROM subscriptions WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1",
      [orgId]
    );

    if (result.rows.length === 0) {
      // Return free plan as default
      return res.json({
        success: true,
        data: {
          orgId,
          plan: 'free',
          status: 'active',
          limits: PLAN_LIMITS.free,
        },
      });
    }

    const sub = result.rows[0];
    res.json({
      success: true,
      data: {
        ...sub,
        limits: PLAN_LIMITS[sub.plan] || PLAN_LIMITS.free,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/subscriptions/cancel - Cancel subscription
router.post('/cancel', async (req, res, next) => {
  try {
    const { orgId } = req.body;
    if (!orgId) return next(new AppError('orgId required', 400, 'VALIDATION_ERROR'));

    const result = await query(
      "UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE org_id = $1 AND status = 'active' RETURNING *",
      [orgId]
    );

    if (result.rows.length === 0) {
      return next(new AppError('No active subscription found', 404, 'NOT_FOUND'));
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/subscriptions/plans - List available plans
router.get('/plans', (req, res) => {
  const plans = Object.entries(PLAN_LIMITS).map(([name, limits]) => ({
    name,
    limits,
    price: { free: 0, pro: 49, enterprise: 299 }[name],
    currency: 'usd',
  }));
  res.json({ success: true, data: plans });
});

module.exports = router;
