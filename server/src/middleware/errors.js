import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import * as Sentry from '@sentry/node';

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(error, req, res, _next) {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ZodError') {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Token expired';
  } else if (error.name === 'MulterError') {
    statusCode = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = 'UPLOAD_ERROR';
    message = error.code === 'LIMIT_FILE_SIZE' ? 'File too large' : `Upload error: ${error.code}`;
  } else if (error.code === 'P2002') {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'A record with these unique values already exists';
  } else if (error.code === 'P2025') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Record not found';
  }

  if (statusCode >= 500) {
    logger.error(
      { err: error, requestId: req.id, path: req.originalUrl },
      'unhandled_error'
    );
    if (process.env.SENTRY_DSN && Sentry.isInitialized()) {
      Sentry.captureException(error);
    }
  } else if (statusCode !== 401 && statusCode !== 403 && statusCode !== 404) {
    logger.warn({ requestId: req.id, path: req.originalUrl, status: statusCode, code }, message);
  }

  res.status(statusCode).json({
    success: false,
    code,
    message: config.isProd && statusCode === 500 ? 'Internal server error' : message,
    ...(details !== undefined ? { details } : {}),
    ...(req.id ? { requestId: req.id } : {})
  });
}

export default errorHandler;
