import path from 'node:path';
import express from 'express';
import { config } from './config/env.js';
import { requestContext } from './middleware/requestContext.js';
import { applyBaseMiddleware } from './middleware/base.js';
import { metricsMiddleware, metricsHandler } from './middleware/metrics.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middleware/errors.js';
import { mountSwagger } from './docs/swagger.js';
import v1Router from './routes/index.js';
import healthRouter from './modules/health/health.routes.js';

export function createApp() {
  const app = express();

  applyBaseMiddleware(app);
  app.use(requestContext);
  app.use(metricsMiddleware);

  if (config.STORAGE_DRIVER === 'local') {
    const storagePath = path.resolve(config.STORAGE_LOCAL_PATH);
    app.use('/uploads', express.static(storagePath, { maxAge: '365d', immutable: true, fallthrough: false }));
  }

  app.get('/metrics', metricsHandler);
  app.use('/', healthRouter);

  mountSwagger(app);

  app.use('/api/v1', apiLimiter, v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
