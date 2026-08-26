import { Worker } from 'bullmq';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { prisma } from '../lib/prisma.js';
import { redis } from '../lib/redis.js';
import { closeAllQueues } from './queues.js';
import { createBullConnection } from './connection.js';
import * as emailWorker from './workers/email.worker.js';
import * as imageWorker from './workers/image.worker.js';
import * as pushWorker from './workers/push.worker.js';
import * as searchWorker from './workers/search.worker.js';

const registry = [emailWorker, imageWorker, pushWorker, searchWorker];
const running = [];

export function startWorkers() {
  for (const definition of registry) {
    const worker = new Worker(definition.name, definition.processor, {
      connection: createBullConnection(),
      concurrency: Number(process.env[`${definition.name.toUpperCase()}_CONCURRENCY`]) || definition.concurrency
    });

    worker.on('completed', (job) => logger.debug({ queue: definition.name, jobId: job.id }, 'job_completed'));
    worker.on('failed', (job, error) =>
      logger.error(
        { queue: definition.name, jobId: job?.id, attempt: job?.attemptsMade, err: error.message },
        'job_failed'
      )
    );
    worker.on('error', (error) => logger.error({ queue: definition.name, err: error.message }, 'worker_error'));

    running.push(worker);
    logger.info(`Worker started: ${definition.name} (concurrency ${worker.opts.concurrency})`);
  }
  return running;
}

export async function shutdownWorkers() {
  await Promise.all(running.map((worker) => worker.close()));
  await closeAllQueues();
  await redis.quit().catch(() => undefined);
  await prisma.$disconnect();
}

const isDirectRun = process.argv[1] && process.argv[1].endsWith('worker.js');

if (isDirectRun) {
  logger.info(`Starting standalone workers (env=${config.NODE_ENV})...`);
  startWorkers();

  const stop = async (signal) => {
    logger.info(`${signal} received, draining workers...`);
    await shutdownWorkers();
    process.exit(0);
  };
  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
}
