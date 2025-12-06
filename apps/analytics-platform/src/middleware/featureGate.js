'use strict';

const { query } = require('@backend-platform/db');
const { PLAN_LIMITS } = require('@backend-platform/types');
const { AppError } = require('./errorHandler');

/**
 * Middleware factory: gate a feature by plan
 * @param {string} feature - Feature key from PLAN_LIMITS (e.g., 'aiSummarization')
 */
function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      const orgId = req.query.orgId || req.body.orgId;
      if (!orgId) return next(new AppError('orgId required', 400, 'VALIDATION_ERROR'));

      const result = await query(
        `SELECT s.plan FROM subscriptions s
         WHERE s.org_id = $1 AND s.status = 'active'
         ORDER BY s.created_at DESC LIMIT 1`,
        [orgId]
      );

      const plan = result.rows[0]?.plan || 'free';
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

      if (!limits[feature]) {
        return next(new AppError(
          `Feature '${feature}' is not available on the ${plan} plan. Upgrade to access this feature.`,
          403,
          'PLAN_LIMIT_EXCEEDED'
        ));
      }

      req.plan = plan;
      req.planLimits = limits;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireFeature };
