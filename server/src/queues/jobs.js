import { config } from '../config/env.js';
import { getQueue, QUEUE_NAMES } from './queues.js';

function enqueue(queueName, jobName, data, options) {
  if (config.isTest || process.env.VITEST) {
    return Promise.resolve(null);
  }
  return getQueue(queueName).add(jobName, data, options);
}

export function queueEmail(template, to, data = {}) {
  return enqueue(QUEUE_NAMES.EMAIL, 'send', { template, to, data });
}

export function queueImageProcess(fileId) {
  return enqueue(QUEUE_NAMES.IMAGE, 'process', { fileId });
}

export function queuePush(userId, payload) {
  return enqueue(QUEUE_NAMES.PUSH, 'send', { userId, ...payload });
}

export function queueSearchIndex(action, user) {
  return enqueue(QUEUE_NAMES.SEARCH, action, { user });
}
