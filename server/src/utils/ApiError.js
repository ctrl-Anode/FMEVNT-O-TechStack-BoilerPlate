export class ApiError extends Error {
  constructor(statusCode, message, code = 'INTERNAL_ERROR', details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'Insufficient permissions') {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }

  static conflict(message = 'Conflict', details) {
    return new ApiError(409, message, 'CONFLICT', details);
  }

  static unprocessable(message = 'Validation failed', details) {
    return new ApiError(422, message, 'VALIDATION_ERROR', details);
  }

  static tooManyRequests(message = 'Too many requests, slow down') {
    return new ApiError(429, message, 'RATE_LIMITED');
  }

  static serviceUnavailable(message = 'Service temporarily unavailable') {
    return new ApiError(503, message, 'SERVICE_DISABLED');
  }
}
