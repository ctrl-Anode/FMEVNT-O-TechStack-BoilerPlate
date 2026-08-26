import { Queue } from 'bullmq';
import { logger } from '../config/logger.js';
import { createBullConnection } from './connection.js';

export const QUEUE_NAMES = {
  EMAIL: 'email',
  IMAGE: 'image',
  PUSH: 'push',
  SEARCH: 'search'
};

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 3000 },
  removeOnComplete: { age: 3600, count: 500 },
  removeOnFail: { age: 86400 }
};

const instances = new Map();

export function getQueue(name) {
  if (!instances.has(name)) {
    instances.set(
      name,
      new Queue(name, {
        connection: createBullConnection(),
        defaultJobOptions
      })
    );
    logger.debug(`Queue registered: ${name}`);
  }
  return instances.get(name);
}

export async function closeAllQueues() {
  for (const [name, queue] of instances.entries()) {
    await queue.close();
    logger.debug(`Queue closed: ${name}`);
  }
  instances.clear();
}
