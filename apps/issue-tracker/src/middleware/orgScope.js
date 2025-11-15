'use strict';

const { query } = require('@backend-platform/db');
const { AppError } = require('./errorHandler');

/**
 * Load org membership for the authenticated user and attach to req.
 * Sets req.membership = { orgId, role }
 * Requires authenticate middleware to have run first.
 */
async function loadOrgMembership(req, res, next) {
  try {
    const orgId = req.params.orgId || req.body.orgId || req.query.orgId || req.user?.orgId;

    if (!orgId) {
      return next(new AppError('Organization context required', 400, 'ORG_REQUIRED'));
    }

    const result = await query(
      'SELECT role FROM organization_members WHERE org_id = $1 AND user_id = $2',
      [orgId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Not a member of this organization', 403, 'FORBIDDEN'));
    }

    req.membership = { orgId, role: result.rows[0].role };
    req.user.orgId = orgId;
    req.user.role = result.rows[0].role;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { loadOrgMembership };
