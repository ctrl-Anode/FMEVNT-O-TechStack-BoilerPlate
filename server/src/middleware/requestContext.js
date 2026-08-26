import crypto from 'node:crypto';
import { logger } from '../config/logger.js';

export function requestContext(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  if (logger) req.log = logger.child({ requestId: req.id });
  next();
}

export default requestContext;
