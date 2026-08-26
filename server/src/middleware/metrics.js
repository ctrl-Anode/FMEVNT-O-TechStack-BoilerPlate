import client from 'prom-client';
import { config } from '../config/env.js';

export const register = new client.Registry();

client.collectDefaultMetrics({ register, prefix: 'node_' });

export const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

register.registerMetric(httpDuration);

function routeLabel(req) {
  if (req.route && req.route.path) {
    return `${req.baseUrl || ''}${req.route.path}` || req.route.path;
  }
  return 'unmatched';
}

export function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics' || req.path === '/healthz') return next();
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    end({
      method: req.method,
      route: routeLabel(req),
      status_code: res.statusCode
    });
  });
  next();
}

export async function metricsHandler(_req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

export function sentryEnabled() {
  return Boolean(config.SENTRY_DSN);
}
