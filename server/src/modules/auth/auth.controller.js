import * as authService from './auth.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

function requestMeta(req) {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  };
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, requestMeta(req));
  res.status(201).json({ success: true, data: result });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, requestMeta(req));
  res.json({ success: true, data: result });
});

export const verifyMfa = asyncHandler(async (req, res) => {
  const result = await authService.verifyMfa(req.body, requestMeta(req));
  res.json({ success: true, data: result });
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body.refreshToken, requestMeta(req));
  res.json({ success: true, data: result });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body?.refreshToken, req.user?.id);
  res.json({ success: true, data: { loggedOut: true } });
});

export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.user.id);
  res.json({ success: true, data: { loggedOut: true } });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.id);
  res.json({ success: true, data: { user } });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  res.json({ success: true, data: result });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.json({ success: true, data: result });
});

export const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body, req.sessionId);
  res.json({ success: true, data: result });
});

export const setupMfa = asyncHandler(async (req, res) => {
  const result = await authService.setupMfa(req.user.id);
  res.json({ success: true, data: result });
});

export const confirmMfa = asyncHandler(async (req, res) => {
  const result = await authService.confirmMfa(req.user.id, req.body.code);
  res.json({ success: true, data: result });
});

export const disableMfa = asyncHandler(async (req, res) => {
  const result = await authService.disableMfa(req.user.id, req.body);
  res.json({ success: true, data: result });
});
