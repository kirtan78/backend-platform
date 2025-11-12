'use strict';

const { hashPassword, comparePassword, signToken } = require('@backend-platform/auth');
const { AppError } = require('../middleware/errorHandler');
const userRepository = require('../repositories/userRepository');

async function register({ email, password }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    throw new AppError('Email already registered', 409, 'CONFLICT');
  }

  const passwordHash = await hashPassword(password);
  const user = await userRepository.create({ email, passwordHash });

  const token = signToken({ userId: user.id, email: user.email });

  return { token, user: { id: user.id, email: user.email, createdAt: user.created_at } };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  const token = signToken({ userId: user.id, email: user.email });

  return { token, user: { id: user.id, email: user.email, createdAt: user.created_at } };
}

module.exports = { register, login };
