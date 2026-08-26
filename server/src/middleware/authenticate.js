import { verifyAccessToken } from '../utils/tokens.js';
import { ApiError } from '../utils/ApiError.js';
import { prisma } from '../lib/prisma.js';
import { remember, cacheDel } from '../lib/cache.js';
import { CACHE_TTL, LOGIN_ALLOWED_STATUSES } from '../config/constants.js';

const AUTH_CACHE_PREFIX = 'user:auth:';

export async function loadUserWithPermissions(userId) {
  return remember(`${AUTH_CACHE_PREFIX}${userId}`, CACHE_TTL.USER_WITH_PERMISSIONS, async () => {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        status: true,
        mfaEnabled: true,
        roles: { select: { role: { select: { name: true } } } }
      }
    });

    if (!user) return null;

    const roleIds = user.roles.map((entry) => entry.role.name);
    const roleRows = await prisma.role.findMany({
      where: { name: { in: roleIds } },
      select: {
        name: true,
        permissions: { select: { permission: { select: { key: true } } } }
      }
    });

    const permissions = new Set();
    for (const row of roleRows) {
      for (const entry of row.permissions) permissions.add(entry.permission.key);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
      roles: roleIds,
      permissions: [...permissions]
    };
  });
}

export async function bustUserAuthCache(userId) {
  await cacheDel(`${AUTH_CACHE_PREFIX}${userId}`);
}

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw ApiError.unauthorized('Missing or malformed Authorization header');
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      const expired = error.name === 'TokenExpiredError';
      throw ApiError.unauthorized(
        expired ? 'Access token expired' : 'Invalid access token',
        expired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      );
    }

    if (payload.type !== 'access') {
      throw ApiError.unauthorized('Invalid token type', 'INVALID_TOKEN');
    }

    const cached = await loadUserWithPermissions(payload.sub);
    if (!cached) throw ApiError.unauthorized('Account no longer exists');

    if (!LOGIN_ALLOWED_STATUSES.includes(cached.status)) {
      throw ApiError.forbidden(`Account ${cached.status.toLowerCase()}`);
    }

    req.user = cached;
    next();
  } catch (error) {
    next(error);
  }
}

export default authenticate;
