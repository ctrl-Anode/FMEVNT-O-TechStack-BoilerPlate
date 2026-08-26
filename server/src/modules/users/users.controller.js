import * as usersService from './users.service.js';
import { serializeUser, serializeUserSummary } from './user.serializer.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

function meta(req) {
  return { actorId: req.user.id, ip: req.ip };
}

export const list = asyncHandler(async (req, res) => {
  const { rows, total, page, limit } = await usersService.listUsers(req.query);
  res.json({
    success: true,
    data: rows.map((user) => serializeUser(user)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
  });
});

export const getById = asyncHandler(async (req, res) => {
  const user = await usersService.getUser(req.params.id);
  res.json({ success: true, data: serializeUser(user, { includePermissions: true }) });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await usersService.getProfile(req.user.id);
  res.json({ success: true, data: serializeUser(user, { includePermissions: true }) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await usersService.updateProfile(req.user.id, req.body);
  res.json({ success: true, data: serializeUser(user) });
});

export const create = asyncHandler(async (req, res) => {
  const user = await usersService.createUser(req.body, req.user.id, req.ip);
  res.status(201).json({ success: true, data: serializeUser(user, { includePermissions: true }) });
});

export const update = asyncHandler(async (req, res) => {
  const { actorId } = meta(req);
  const user = await usersService.updateUser(req.params.id, req.body, actorId, req.ip);
  res.json({ success: true, data: serializeUser(user, { includePermissions: true }) });
});

export const remove = asyncHandler(async (req, res) => {
  const { actorId } = meta(req);
  await usersService.softDeleteUser(req.params.id, actorId, req.ip);
  res.json({ success: true, data: { deleted: true } });
});

export { serializeUserSummary };
