import { z } from 'zod';
import { USER_STATUS } from '../../config/constants.js';

const uuidField = z.string().uuid();

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  sort: z.enum(['createdAt', '-createdAt', 'firstName', '-firstName', 'email', '-email']).optional(),
  q: z.string().trim().max(100).optional(),
  status: z.enum(Object.values(USER_STATUS)).optional(),
  roleId: uuidField.optional()
});

export const getUserParamsSchema = z.object({ id: uuidField });

export const createUserSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10).max(128),
  status: z.enum(Object.values(USER_STATUS)).optional(),
  roleIds: z.array(uuidField).min(1).default([])
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  status: z.enum(Object.values(USER_STATUS)).optional(),
  roleIds: z.array(uuidField).optional()
});

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional()
});
