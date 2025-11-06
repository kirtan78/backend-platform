'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('@backend-platform/config');

const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password
 * @param {string} password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a stored hash
 * @param {string} password
 * @param {string} hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Sign a JWT token with user + org context
 * @param {Object} payload - { userId, email, orgId, role }
 */
function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

/**
 * Verify and decode a JWT token
 * @param {string} token
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

/**
 * Express middleware: verify JWT and attach user to req
 * Attaches req.user = { userId, email, orgId, role }
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: { message: 'No token provided', code: 'UNAUTHORIZED' },
    });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid or expired token', code: 'UNAUTHORIZED' },
    });
  }
}

/**
 * Middleware factory: require a minimum role level
 * Role hierarchy: admin > member
 * @param {string} requiredRole - 'admin' or 'member'
 */
function requireRole(requiredRole) {
  const hierarchy = { admin: 2, member: 1 };
  return (req, res, next) => {
    const userLevel = hierarchy[req.user?.role] || 0;
    const requiredLevel = hierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions', code: 'FORBIDDEN' },
      });
    }
    next();
  };
}

/**
 * Check if a user has at least the given role (for use in services)
 * @param {string} userRole
 * @param {string} requiredRole
 */
function hasRole(userRole, requiredRole) {
  const hierarchy = { admin: 2, member: 1 };
  return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0);
}

module.exports = {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  authenticate,
  requireRole,
  hasRole,
};
