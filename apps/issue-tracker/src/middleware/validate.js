'use strict';

const { AppError } = require('./errorHandler');

/**
 * Validate request body against a Joi schema
 * @param {Object} schema - Joi schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const message = error.details.map((d) => d.message).join(', ');
      return next(new AppError(message, 400, 'VALIDATION_ERROR'));
    }
    req.body = value;
    next();
  };
}

/**
 * Validate query params against a Joi schema
 * @param {Object} schema - Joi schema
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) {
      const message = error.details.map((d) => d.message).join(', ');
      return next(new AppError(message, 400, 'VALIDATION_ERROR'));
    }
    req.query = value;
    next();
  };
}

module.exports = { validateBody, validateQuery };
