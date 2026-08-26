import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { cacheDelPrefix, remember } from '../../lib/cache.js';
import { CACHE_TTL } from '../../config/constants.js';
import { logAudit } from '../../services/audit.js';

const includePermissions = {
  permissions: { select: { permission: { select: { id: true, key: true, description: true } } } },
  _count: { select: { users: true } }
};

function invalidateRoleCache() {
  return cacheDelPrefix('user:auth:');
}

export async function listRoles() {
  return remember('roles:list', CACHE_TTL.ROLE_LIST, async () =>
    prisma.role.findMany({
      include: includePermissions,
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }]
    })
  );
}

export async function listPermissions() {
  return prisma.permission.findMany({ orderBy: { key: 'asc' } });
}

export async function createRole(input, actorId, ip) {
  if (input.name === '*') throw ApiError.badRequest('Reserved role name');

  const existing = await prisma.role.findUnique({ where: { name: input.name } });
  if (existing) throw ApiError.conflict('A role with this name already exists');

  const created = await prisma.$transaction(async (tx) => {
    const role = await tx.role.create({
      data: { name: input.name, description: input.description },
      include: includePermissions
    });
    if (input.permissionKeys.length > 0) {
      const permissions = await tx.permission.findMany({ where: { key: { in: input.permissionKeys } } });
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id }))
      });
    }
    return tx.role.findUniqueOrThrow({ where: { id: role.id }, include: includePermissions });
  });

  await invalidateRoleCache();
  logAudit({ userId: actorId, action: 'role.created', entity: 'role', entityId: created.id, ip });
  return created;
}

export async function updateRole(id, input, actorId, ip) {
  const role = await prisma.role.findUnique({ where: { id }, include: includePermissions });
  if (!role) throw ApiError.notFound('Role not found');

  if (role.isSystem && Array.isArray(input.permissionKeys)) {
    throw ApiError.forbidden('System role permissions cannot be modified');
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (Array.isArray(input.permissionKeys)) {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      const permissions = await tx.permission.findMany({ where: { key: { in: input.permissionKeys } } });
      if (permissions.length !== new Set(input.permissionKeys).size) {
        throw ApiError.badRequest('Unknown permission key provided');
      }
      await tx.rolePermission.createMany({
        data: permissions.map((permission) => ({ roleId: id, permissionId: permission.id }))
      });
    }
    return tx.role.update({
      where: { id },
      data: { ...(input.description !== undefined ? { description: input.description } : {}) },
      include: includePermissions
    });
  });

  await invalidateRoleCache();
  logAudit({ userId: actorId, action: 'role.updated', entity: 'role', entityId: id, ip });
  return updated;
}

export async function deleteRole(id, actorId, ip) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw ApiError.notFound('Role not found');
  if (role.isSystem) throw ApiError.forbidden('System roles cannot be deleted');

  await prisma.role.delete({ where: { id } });
  await invalidateRoleCache();
  logAudit({ userId: actorId, action: 'role.deleted', entity: 'role', entityId: id, ip });
  return { deleted: true };
}
