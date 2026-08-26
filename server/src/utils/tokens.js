import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function signAccessToken(user, sessionId) {
  return jwt.sign({ sub: user.id, sid: sessionId, type: 'access' }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_TTL
  });
}

export function signMfaToken(userId) {
  return jwt.sign({ sub: userId, purpose: 'mfa' }, config.MFA_TOKEN_SECRET, { expiresIn: 300 });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.JWT_ACCESS_SECRET);
}

export function verifyMfaToken(token) {
  const payload = jwt.verify(token, config.MFA_TOKEN_SECRET);
  if (payload.purpose !== 'mfa') throw new Error('invalid_purpose');
  return payload;
}

export function generateOpaqueToken() {
  return crypto.randomBytes(48).toString('hex');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export const hashRefreshToken = (token) => sha256(token);
export const hashResetToken = (token) => sha256(token);

export function randomHex(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}
