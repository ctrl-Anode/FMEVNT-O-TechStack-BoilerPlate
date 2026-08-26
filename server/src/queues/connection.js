import Redis from 'ioredis';
import { config } from '../config/env.js';

export function createBullConnection() {
  return new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true
  });
}
