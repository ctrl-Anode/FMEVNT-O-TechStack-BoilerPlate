import * as Sentry from '@sentry/node';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { createApp } from './app.js';

if (config.SENTRY_DSN) {
  Sentry.init({
    dsn: config.SENTRY_DSN,
    environment: config.SENTRY_ENVIRONMENT || config.NODE_ENV,
    tracesSampleRate: config.isProd ? 0.2 : 1.0
  });
  logger.info('Sentry initialized');
}

const app = createApp();
const server = app.listen(config.PORT, () => {
  logger.info(`API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
  logger.info(`Swagger docs at http://localhost:${config.PORT}/api/docs`);
});

if (config.WORKER_MODE === 'inline' && !config.isTest) {
  const { startWorkers } = await import('./queues/worker.js');
  startWorkers();
  logger.info('Inline queue workers started');
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down gracefully...`);

  const forceTimer = setTimeout(() => process.exit(1), 10000);
  server.close(async () => {
    clearTimeout(forceTimer);
    try {
      if (config.WORKER_MODE === 'inline') {
        const { shutdownWorkers } = await import('./queues/worker.js');
        await shutdownWorkers().catch(() => undefined);
      }
      const { prisma } = await import('./lib/prisma.js');
      await prisma.$disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'shutdown_error');
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled_rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'uncaught_exception');
  process.exit(1);
});
