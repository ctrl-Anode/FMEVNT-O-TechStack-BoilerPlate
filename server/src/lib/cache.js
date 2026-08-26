import { redis } from './redis.js';
import { logger } from '../config/logger.js';

export async function cacheGet(key) {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.warn({ err: error.message, key }, 'cache_get_failed');
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return true;
  } catch (error) {
    logger.warn({ err: error.message, key }, 'cache_set_failed');
    return false;
  }
}

export async function cacheDel(...keys) {
  try {
    if (keys.length > 0) await redis.del(...keys);
    return true;
  } catch (error) {
    logger.warn({ err: error.message }, 'cache_del_failed');
    return false;
  }
}

export async function cacheDelPrefix(prefix) {
  try {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
      cursor = next;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== '0');
    return true;
  } catch (error) {
    logger.warn({ err: error.message, prefix }, 'cache_del_prefix_failed');
    return false;
  }
}

export async function remember(key, ttlSeconds, producer) {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;
  const fresh = await producer();
  if (fresh !== null && fresh !== undefined) await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}
