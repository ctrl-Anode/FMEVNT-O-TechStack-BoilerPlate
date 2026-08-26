import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { hashPassword } from '../../utils/password.js';
import { parsePagination } from '../../utils/pagination.js';
import { queueSearchIndex } from '../../queues/jobs.js';
import { logAudit } from '../../services/audit.js';
import { bustUserAuthCache } from '../../middleware/authenticate.js';
import { serializeUserSummary } from './user.serializer.js';

const includeRoles = {
  roles: {
    select: { role: { select: { id: true, name: true, permissions: { select: { permission: { select: { key: true } } } } } } }
  }
};

function replaceRoles(tx, userId, roleIds) {
  return tx.userRole.deleteMany({ where: { userId } }).then(() =>
    tx.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true
    })
  );
}

export async function listUsers(query) {
  const { page, limit, offset, orderBy } = parsePagination(query, {
    sortable: ['createdAt', 'firstName', 'email']
  });

  const where = {
    deletedAt: null,
    ...(query.status ? { status: query.status } : {}),
    ...(query.roleId ? { roles: { some: { roleId: query.roleId } } } : {}),
    ...(query.q
      ? {
          OR: [
            { email: { contains: query.q } },
            { firstName: { contains: query.q } },
            { lastName: { contains: query.q } }
          ]
        }
      : {})
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: includeRoles,
      orderBy,
      skip: offset,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  return { rows, total, page, limit };
}

export async function getUser(id) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: {
      ...includeRoles,
      sessions: {
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, createdAt: true, lastUsedAt: true },
        take: 5
      }
    }
  });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function getProfile(userId) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    include: includeRoles
  });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function createUser(input, actorId, ip) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('Email already in use');

  if (input.roleIds.length > 0) {
    const count = await prisma.role.count({ where: { id: { in: input.roleIds } } });
    if (count !== input.roleIds.length) throw ApiError.badRequest('One or more roles do not exist');
  }

  const created = await prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      ...(input.status ? { status: input.status } : {}),
      roles: { create: input.roleIds.map((roleId) => ({ roleId })) }
    },
    include: includeRoles
  });

  logAudit({ userId: actorId, action: 'user.created', entity: 'user', entityId: created.id, ip });
  return created;
}

export async function updateUser(id, input, actorId, ip) {
  const target = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!target) throw ApiError.notFound('User not found');

  if (input.email && input.email !== target.email) {
    const clash = await prisma.user.findUnique({ where: { email: input.email } });
    if (clash) throw ApiError.conflict('Email already in use');
  }

  if (Array.isArray(input.roleIds) && id === actorId) {
    const adminRole = await prisma.role.findUnique({ where: { name: 'admin' } });
    if (adminRole) {
      const isSelfAdmin = await prisma.userRole.findFirst({ where: { userId: id, roleId: adminRole.id } });
      if (isSelfAdmin && !input.roleIds.includes(adminRole.id)) {
        throw ApiError.forbidden('You cannot remove your own admin role');
      }
    }
  }

  if (Array.isArray(input.roleIds)) {
    const count = await prisma.role.count({ where: { id: { in: input.roleIds } } });
    if (count !== new Set(input.roleIds).size) throw ApiError.badRequest('One or more roles do not exist');
  }

  const { roleIds, ...scalarInput } = input;
  const updated = await prisma.$transaction(async (tx) => {
    if (Array.isArray(roleIds)) await replaceRoles(tx, id, roleIds);
    return tx.user.update({ where: { id }, data: scalarInput, include: includeRoles });
  });

  await bustUserAuthCache(id);
  queueSearchIndex('index', updated);
  logAudit({ userId: actorId, action: 'user.updated', entity: 'user', entityId: id, ip, meta: { fields: Object.keys(input) } });
  return updated;
}

export async function softDeleteUser(id, actorId, ip) {
  if (id === actorId) throw ApiError.forbidden('You cannot delete your own account');

  const target = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!target) throw ApiError.notFound('User not found');

  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'INACTIVE' } }),
    prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })
  ]);

  await bustUserAuthCache(id);
  queueSearchIndex('remove', { id });
  logAudit({ userId: actorId, action: 'user.deleted', entity: 'user', entityId: id, ip });
  return { deleted: true };
}

export async function updateProfile(userId, input) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: input,
    include: includeRoles
  });
  await bustUserAuthCache(userId);
  queueSearchIndex('index', updated);
  return updated;
}

export { serializeUserSummary };
