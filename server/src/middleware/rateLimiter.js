import RedisStore from 'rate-limit-redis';
import rateLimit from 'express-rate-limit';
import { redis } from '../lib/redis.js';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

function store() {
  return new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix: 'rl:'
  });
}

function build(max, message) {
  if (config.isTest || process.env.VITEST) {
    return (_req, _res, next) => next();
  }

  return rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: store(),
    passOnStoreError: true,
    handler: () => {
      throw ApiError.tooManyRequests(message);
    }
  });
}

export const apiLimiter = build(config.RATE_LIMIT_MAX, 'Too many requests, please slow down.');

export const authLimiter = build(
  config.AUTH_RATE_LIMIT_MAX,
  'Too many authentication attempts. Try again later.'
);
