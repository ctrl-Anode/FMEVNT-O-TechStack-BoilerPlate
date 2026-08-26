import Redis from 'ioredis';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  retryStrategy: (times) => Math.min(times * 250, 5000),
  lazyConnect: false
});

redis.on('error', (error) => {
  logger.warn({ err: error.message }, 'Redis error');
});

redis.on('ready', () => {
  if (!config.isTest) logger.info('Redis connected');
});
