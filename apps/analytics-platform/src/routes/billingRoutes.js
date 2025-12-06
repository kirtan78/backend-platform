'use strict';

const express = require('express');
const Joi = require('joi');
const { query } = require('@backend-platform/db');
const { PLANS } = require('@backend-platform/types');
const { generateWebhookSignature, verifyWebhookSignature } = require('@backend-platform/utils');
const config = require('@backend-platform/config');
const logger = require('@backend-platform/logger');
const { AppError } = require('../middleware/errorHandler');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/v1/billing/checkout - Stripe-like checkout simulation
router.post('/checkout', async (req, res, next) => {
  try {
    const schema = Joi.object({
      orgId: Joi.string().uuid().required(),
      plan: Joi.string().valid('free', 'pro', 'enterprise').required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return next(new AppError(error.message, 400, 'VALIDATION_ERROR'));

    const { orgId, plan } = value;

    // Check for existing active subscription
    const existing = await query(
      "SELECT id FROM subscriptions WHERE org_id = $1 AND status = 'active'",
      [orgId]
    );

    if (existing.rows.length > 0) {
      return next(new AppError('Organization already has an active subscription', 409, 'CONFLICT'));
    }

    // Simulate Stripe checkout session
    const checkoutSessionId = `cs_sim_${uuidv4().replace(/-/g, '')}`;
    const planPrices = { free: 0, pro: 49, enterprise: 299 };
    const amount = planPrices[plan] * 100; // in cents

    // Create invoice
    const invoiceResult = await query(
      `INSERT INTO invoices (id, org_id, amount_cents, currency, status, stripe_invoice_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [uuidv4(), orgId, amount, 'usd', 'pending', checkoutSessionId]
    );

    logger.info('Checkout session created', { orgId, plan, checkoutSessionId });

    res.status(201).json({
      success: true,
      data: {
        checkoutSessionId,
        plan,
        amount,
        currency: 'usd',
        invoice: invoiceResult.rows[0],
        message: 'Call POST /billing/webhook to simulate payment success',
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/billing/webhook - Stripe webhook simulation
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const body = req.body;
    const bodyStr = Buffer.isBuffer(body) ? body.toString() : JSON.stringify(body);

    // Parse the body
    let event;
    try {
      event = JSON.parse(bodyStr);
    } catch {
      return next(new AppError('Invalid JSON payload', 400, 'VALIDATION_ERROR'));
    }

    const { type, data } = event;
    logger.info('Webhook received', { type });

    if (type === 'payment_intent.succeeded') {
      const { orgId, plan, invoiceId } = data;

      // Create or update subscription
      const subId = uuidv4();
      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days

      await query(
        `INSERT INTO subscriptions (id, org_id, plan, status, current_period_start, current_period_end)
         VALUES ($1, $2, $3, 'active', $4, $5)
         ON CONFLICT (org_id) DO UPDATE SET plan = $3, status = 'active',
           current_period_start = $4, current_period_end = $5, updated_at = NOW()`,
        [subId, orgId, plan, periodStart, periodEnd]
      );

      // Mark invoice as paid
      if (invoiceId) {
        await query("UPDATE invoices SET status = 'paid' WHERE id = $1", [invoiceId]);
      }

      logger.info('Subscription activated', { orgId, plan });
    } else if (type === 'payment_intent.payment_failed') {
      const { orgId } = data;
      await query(
        "UPDATE subscriptions SET status = 'past_due' WHERE org_id = $1 AND status = 'active'",
        [orgId]
      );
      logger.warn('Subscription set to past_due', { orgId });
    }

    res.json({ success: true, data: { received: true } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/billing/invoices?orgId=
router.get('/invoices', async (req, res, next) => {
  try {
    const { orgId } = req.query;
    if (!orgId) return next(new AppError('orgId required', 400, 'VALIDATION_ERROR'));

    const result = await query(
      'SELECT * FROM invoices WHERE org_id = $1 ORDER BY created_at DESC',
      [orgId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
