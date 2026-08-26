import { z } from 'zod';

const uuidField = z.string().uuid();

export const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(50).regex(/^[a-z][a-z0-9_-]*$/, 'Lowercase letters, numbers, dashes'),
  description: z.string().trim().max(255).optional(),
  permissionKeys: z.array(z.string()).default([])
});

export const updateRoleSchema = z.object({
  description: z.string().trim().max(255).optional(),
  permissionKeys: z.array(z.string()).optional()
});

export const roleParamsSchema = z.object({ id: uuidField });
