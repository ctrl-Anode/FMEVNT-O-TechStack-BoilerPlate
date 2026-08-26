import { prisma } from '../lib/prisma.js';
import { logger } from '../config/logger.js';
import { meili, USERS_INDEX, ensureUsersIndex } from '../lib/meilisearch.js';

export function buildUserDocument(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    avatarUrl: user.avatarUrl,
    status: user.status,
    roleNames: (user.roles || []).map((entry) => entry.role?.name ?? entry),
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt
  };
}

export async function indexUser(user) {
  if (!meili) return;
  try {
    const index = meili.index(USERS_INDEX);
    await index.updateDocuments([buildUserDocument(user)], { primaryKey: 'id' });
  } catch (error) {
    logger.warn({ err: error.message }, 'meili_index_user_failed');
  }
}

export async function removeUser(userId) {
  if (!meili) return;
  try {
    await meili.index(USERS_INDEX).deleteDocument(userId);
  } catch (error) {
    logger.warn({ err: error.message }, 'meili_remove_user_failed');
  }
}

export async function searchUsers({ q = '', page = 1, limit = 20 }) {
  if (meili) {
    await ensureUsersIndex();
    const result = await meili.index(USERS_INDEX).search(q, {
      limit,
      offset: (page - 1) * limit
    });
    return { rows: result.hits, total: result.estimatedTotalHits };
  }

  const where = q
    ? {
        OR: [
          { email: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } }
        ]
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where: { ...where, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, status: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where: { ...where, deletedAt: null } })
  ]);

  return { rows, total };
}
