'use strict';

const dotenv = require('dotenv');
const Joi = require('joi');
const path = require('path');

// Load .env from monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // Postgres
  POSTGRES_HOST: Joi.string().default('localhost'),
  POSTGRES_PORT: Joi.number().default(5432),
  POSTGRES_DB: Joi.string().default('backend_platform'),
  POSTGRES_USER: Joi.string().default('postgres'),
  POSTGRES_PASSWORD: Joi.string().default('postgres'),

  // MongoDB
  MONGO_URI: Joi.string().default('mongodb://localhost:27017/backend_platform'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  // JWT
  JWT_SECRET: Joi.string().default('default-jwt-secret-change-in-production'),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // OpenAI
  OPENAI_API_KEY: Joi.string().allow('').default(''),

  // Service Ports
  ISSUE_TRACKER_PORT: Joi.number().default(3001),
  NOTIFICATION_SERVICE_PORT: Joi.number().default(3002),
  ANALYTICS_PLATFORM_PORT: Joi.number().default(3003),

  // Seed
  SEED_SECRET: Joi.string().default('demo-seed-secret'),

  // Webhook
  WEBHOOK_SECRET: Joi.string().default('webhook-secret-key'),
}).unknown(true);

const { error, value: envVars } = schema.validate(process.env);

if (error && process.env.NODE_ENV !== 'test') {
  console.warn(`Config validation warning: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',

  postgres: {
    host: envVars.POSTGRES_HOST,
    port: envVars.POSTGRES_PORT,
    database: envVars.POSTGRES_DB,
    user: envVars.POSTGRES_USER,
    password: envVars.POSTGRES_PASSWORD,
  },

  mongo: {
    uri: envVars.MONGO_URI,
  },

  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD || undefined,
  },

  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
  },

  openai: {
    apiKey: envVars.OPENAI_API_KEY,
  },

  ports: {
    issueTracker: envVars.ISSUE_TRACKER_PORT,
    notificationService: envVars.NOTIFICATION_SERVICE_PORT,
    analyticsPlatform: envVars.ANALYTICS_PLATFORM_PORT,
  },

  seedSecret: envVars.SEED_SECRET,
  webhookSecret: envVars.WEBHOOK_SECRET,
};

module.exports = config;
