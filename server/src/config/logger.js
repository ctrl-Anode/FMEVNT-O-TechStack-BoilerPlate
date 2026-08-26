import pino from 'pino';
import { config } from './env.js';

export const logger = pino({
  level: config.isTest ? 'warn' : process.env.LOG_LEVEL || (config.isDev ? 'debug' : 'info'),
  base: { env: config.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.newPassword',
      'body.currentPassword',
      '*.passwordHash',
      '*.refreshToken',
      '*.mfaSecret'
    ],
    censor: '[REDACTED]'
  },
  transport:
    config.isDev && !config.isTest
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' } }
      : undefined
});
