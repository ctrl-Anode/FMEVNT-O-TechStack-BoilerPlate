import crypto from 'node:crypto';

const randomId = () => crypto.randomUUID();

export const db = {
  users: [],
  roles: [],
  permissions: [],
  userRoles: [],
  rolePermissions: [],
  sessions: [],
  passwordResetTokens: [],
  devices: [],
  notifications: [],
  files: [],
  auditLogs: []
};

export function resetDb() {
  for (const key of Object.keys(db)) db[key] = [];
}

function nowDate() {
  return new Date();
}

function equals(a, b) {
  if (a instanceof Date || b instanceof Date) {
    return new Date(a).getTime() === new Date(b).getTime();
  }
  return a === b;
}

function matchOperators(actual, expected) {
  if (expected === null || expected === undefined) return actual === null || actual === undefined;
  if (Array.isArray(expected)) return false;
  if (typeof expected === 'object') {
    for (const [op, value] of Object.entries(expected)) {
      switch (op) {
        case 'in':
          if (!value.includes(actual)) return false;
          break;
        case 'notIn':
          if (value.includes(actual)) return false;
          break;
        case 'contains':
          if (!String(actual ?? '').includes(value)) return false;
          break;
        case 'gt':
          if (!(new Date(actual) > new Date(value))) return false;
          break;
        case 'gte':
          if (!(new Date(actual) >= new Date(value))) return false;
          break;
        case 'lt':
          if (!(new Date(actual) < new Date(value))) return false;
          break;
        case 'not':
          if (equals(actual, value)) return false;
          break;
        default:
          return false;
      }
    }
    return true;
  }
  return equals(actual, expected);
}

function matchWhere(row, where = {}, relation = {}) {
  for (const [key, condition] of Object.entries(where)) {
    if (key === 'OR') {
      const matched = condition.some((sub) => matchWhere(row, sub, relation));
      if (!matched) return false;
      continue;
    }
    if (key === 'AND') {
      if (!condition.every((sub) => matchWhere(row, sub, relation))) return false;
      continue;
    }
    if (key === 'NOT') {
      if (matchWhere(row, condition, relation)) return false;
      continue;
    }
    if (key === 'roles' && condition?.some) {
      const links = relation.userRoles.filter((link) => link.userId === row.id);
      const matched = links.some((link) => matchWhere(link, condition.some));
      if (!matched) return false;
      continue;
    }
    if (condition === null) {
      if (row[key] !== null && row[key] !== undefined) return false;
      continue;
    }
    if (!(key in row)) return false;
    if (!matchOperators(row[key], condition)) return false;
  }
  return true;
}

function hydrateRole(role) {
  if (!role) return null;
  const links = db.rolePermissions.filter((link) => link.roleId === role.id);
  return {
    ...role,
    permissions: links.map((link) => ({
      permission: db.permissions.find((p) => p.id === link.permissionId)
    })),
    _count: { users: db.userRoles.filter((ur) => ur.roleId === role.id).length }
  };
}

function hydrateUser(user) {
  if (!user) return null;
  const links = db.userRoles.filter((ur) => ur.userId === user.id);
  return {
    ...user,
    roles: links.map((link) => ({ role: hydrateRole(db.roles.find((r) => r.id === link.roleId)) }))
  };
}

function applyOrder(rows, orderBy) {
  if (!orderBy) return rows;
  const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const order of entries) {
      const [field, dir] = Object.entries(order)[0];
      const av = a[field] instanceof Date ? a[field].getTime() : a[field];
      const bv = b[field] instanceof Date ? b[field].getTime() : b[field];
      if (av !== bv) return (av > bv ? 1 : -1) * (dir === 'desc' ? -1 : 1);
    }
    return 0;
  });
}

function createUser(data) {
  const user = {
    id: data.id || randomId('usr'),
    email: data.email,
    passwordHash: data.passwordHash ?? null,
    firstName: data.firstName,
    lastName: data.lastName,
    avatarUrl: data.avatarUrl ?? null,
    status: data.status || 'ACTIVE',
    mfaEnabled: data.mfaEnabled ?? false,
    mfaSecret: data.mfaSecret ?? null,
    emailVerifiedAt: data.emailVerifiedAt ?? null,
    lastLoginAt: data.lastLoginAt ?? null,
    createdAt: data.createdAt || nowDate(),
    updatedAt: nowDate(),
    deletedAt: data.deletedAt ?? null
  };
  db.users.push(user);
  for (const link of data.roles?.create || []) {
    db.userRoles.push({ userId: user.id, roleId: link.roleId });
  }
  return user;
}

const userModel = {
  findUnique: ({ where }) => {
    if (where.email) return Promise.resolve(hydrateUser(db.users.find((u) => u.email === where.email)));
    if (where.id) return Promise.resolve(hydrateUser(db.users.find((u) => u.id === where.id)));
    return Promise.resolve(null);
  },
  findFirst: ({ where }) => {
    const found = db.users.find((u) => matchWhere(u, where, { userRoles: db.userRoles }));
    return Promise.resolve(found ? hydrateUser(found) : null);
  },
  findMany: ({ where, orderBy, skip = 0, take } = {}) => {
    let rows = db.users.filter((u) => !where || matchWhere(u, where, { userRoles: db.userRoles }));
    rows = applyOrder(rows.map(hydrateUser), orderBy);
    rows = rows.slice(skip, take !== undefined ? skip + take : undefined);
    return Promise.resolve(rows);
  },
  count: ({ where } = {}) =>
    Promise.resolve(db.users.filter((u) => !where || matchWhere(u, where, { userRoles: db.userRoles })).length),
  create: ({ data }) => Promise.resolve(hydrateUser(createUser(data))),
  update: ({ where, data }) => {
    const user = db.users.find((u) => u.id === where.id);
    if (!user) return Promise.reject(Object.assign(new Error('not found'), { code: 'P2025' }));
    Object.assign(user, data, { updatedAt: nowDate() });
    return Promise.resolve(hydrateUser(user));
  },
  delete: ({ where }) => {
    const index = db.users.findIndex((u) => u.id === where.id);
    if (index >= 0) db.users.splice(index, 1);
    return Promise.resolve(true);
  }
};

const roleModel = {
  findUnique: ({ where }) =>
    Promise.resolve(
      where.name
        ? hydrateRole(db.roles.find((r) => r.name === where.name))
        : hydrateRole(db.roles.find((r) => r.id === where.id))
    ),
  findUniqueOrThrow: ({ where }) => {
    const role = where.name
      ? db.roles.find((r) => r.name === where.name)
      : db.roles.find((r) => r.id === where.id);
    if (!role) return Promise.reject(new Error('role not found'));
    return Promise.resolve(hydrateRole(role));
  },
  findFirst: ({ where }) =>
    Promise.resolve(db.roles.find((r) => matchWhere(r, where)) || null),
  findMany: ({ where } = {}) =>
    Promise.resolve(
      db.roles
        .filter((r) => !where || matchWhere(r, where))
        .map(hydrateRole)
    ),
  count: ({ where } = {}) => Promise.resolve(db.roles.filter((r) => !where || matchWhere(r, where)).length),
  create: ({ data }) => {
    const role = {
      id: data.id || randomId('rol'),
      name: data.name,
      description: data.description ?? null,
      isSystem: data.isSystem ?? false,
      createdAt: nowDate()
    };
    db.roles.push(role);
    return Promise.resolve(hydrateRole(role));
  },
  update: ({ where, data }) => {
    const role = db.roles.find((r) => r.id === where.id);
    if (!role) return Promise.reject(new Error('not found'));
    Object.assign(role, data);
    return Promise.resolve(hydrateRole(role));
  },
  delete: ({ where }) => {
    const index = db.roles.findIndex((r) => r.id === where.id);
    if (index >= 0) db.roles.splice(index, 1);
    db.rolePermissions.filter((rp) => rp.roleId === where.id).forEach((rp) => {
      const idx = db.rolePermissions.indexOf(rp);
      db.rolePermissions.splice(idx, 1);
    });
    db.userRoles.filter((ur) => ur.roleId === where.id).forEach((ur) => {
      const idx = db.userRoles.indexOf(ur);
      db.userRoles.splice(idx, 1);
    });
    return Promise.resolve(true);
  }
};

const sessionModel = {
  create: ({ data }) => {
    const session = {
      id: randomId('ses'),
      userId: data.userId,
      refreshTokenHash: data.refreshTokenHash,
      userAgent: data.userAgent ?? null,
      ip: data.ip ?? null,
      expiresAt: data.expiresAt,
      revokedAt: data.revokedAt ?? null,
      lastUsedAt: nowDate(),
      createdAt: nowDate()
    };
    db.sessions.push(session);
    return Promise.resolve(session);
  },
  findUnique: ({ where }) => {
    let session = null;
    if (where.refreshTokenHash) session = db.sessions.find((s) => s.refreshTokenHash === where.refreshTokenHash);
    else if (where.id) session = db.sessions.find((s) => s.id === where.id);
    if (!session) return Promise.resolve(null);
    return Promise.resolve({ ...session, user: db.users.find((u) => u.id === session.userId) });
  },
  update: ({ where, data }) => {
    const session = db.sessions.find((s) => s.id === where.id);
    if (!session) return Promise.reject(new Error('not found'));
    Object.assign(session, data);
    return Promise.resolve(session);
  },
  updateMany: ({ where, data }) => {
    let count = 0;
    for (const session of db.sessions) {
      const { id, userId, revokedAt } = where;
      if (userId && session.userId !== userId) continue;
      if (revokedAt === null && session.revokedAt !== null) continue;
      if (id?.not && session.id === id.not) continue;
      Object.assign(session, data);
      count += 1;
    }
    return Promise.resolve({ count });
  },
  count: ({ where = {} } = {}) =>
    Promise.resolve(
      db.sessions.filter((s) => {
        if (where.revokedAt === null && s.revokedAt !== null) return false;
        if (where.expiresAt?.gt && !(new Date(s.expiresAt) > new Date(where.expiresAt.gt))) return false;
        return true;
      }).length
    )
};

const genericModel = (collection, defaults = {}) => ({
  create: ({ data }) => {
    const row = { id: randomId(collection), ...defaults, ...data, createdAt: nowDate() };
    db[collection].push(row);
    return Promise.resolve(row);
  },
  createMany: ({ data }) => {
    for (const item of data) db[collection].push({ id: randomId(collection), ...item });
    return Promise.resolve({ count: data.length });
  },
  findUnique: ({ where }) => Promise.resolve(db[collection].find((row) => row.id === where.id) || null),
  findUniqueOrThrow: ({ where }) => {
    const row = db[collection].find((r) => r.id === where.id);
    if (!row) return Promise.reject(new Error('not found'));
    return Promise.resolve(row);
  },
  findFirst: ({ where } = {}) => Promise.resolve(db[collection].find((row) => matchWhere(row, where)) || null),
  findMany: ({ where } = {}) => Promise.resolve(db[collection].filter((row) => !where || matchWhere(row, where))),
  update: ({ where, data }) => {
    const row = db[collection].find((r) => r.id === where.id);
    if (!row) return Promise.reject(new Error('not found'));
    Object.assign(row, data);
    return Promise.resolve(row);
  },
  updateMany: ({ where, data }) => {
    let count = 0;
    for (const row of db[collection]) {
      if (matchWhere(row, where)) {
        Object.assign(row, data);
        count += 1;
      }
    }
    return Promise.resolve({ count });
  },
  delete: ({ where }) => {
    const index = db[collection].findIndex((row) => row.id === where.id);
    if (index >= 0) db[collection].splice(index, 1);
    return Promise.resolve(true);
  },
  deleteMany: ({ where = {} } = {}) => {
    const keep = db[collection].filter((row) => !matchWhere(row, where));
    const removed = db[collection].length - keep.length;
    db[collection] = keep;
    return Promise.resolve({ count: removed });
  },
  count: ({ where } = {}) => Promise.resolve(db[collection].filter((row) => !where || matchWhere(row, where)).length),
  upsert: ({ where, update, create }) => {
    const key = Object.keys(where)[0];
    const row = db[collection].find((item) => item[key] === where[key]);
    if (row) {
      Object.assign(row, update);
      return Promise.resolve(row);
    }
    return genericCreate(collection, create);
  }
});

function genericCreate(collection, data) {
  const row = { id: randomId(collection), ...data, createdAt: nowDate() };
  db[collection].push(row);
  return Promise.resolve(row);
}

export const fakePrisma = {
  user: userModel,
  role: roleModel,
  session: sessionModel,
  userRole: {
    ...genericModel('userRoles'),
    findFirst: ({ where }) =>
      Promise.resolve(db.userRoles.find((link) => matchWhere(link, where)) || null),
    deleteMany: ({ where = {} } = {}) => {
      const keep = db.userRoles.filter((link) => !matchWhere(link, where));
      const removed = db.userRoles.length - keep.length;
      db.userRoles = keep;
      return Promise.resolve({ count: removed });
    },
    createMany: ({ data }) => {
      for (const item of data) {
        if (!db.userRoles.some((link) => link.userId === item.userId && link.roleId === item.roleId)) {
          db.userRoles.push(item);
        }
      }
      return Promise.resolve({ count: data.length });
    }
  },
  rolePermission: {
    ...genericModel('rolePermissions'),
    deleteMany: ({ where = {} } = {}) => {
      const keep = db.rolePermissions.filter((link) => !matchWhere(link, where));
      const removed = db.rolePermissions.length - keep.length;
      db.rolePermissions = keep;
      return Promise.resolve({ count: removed });
    },
    createMany: ({ data }) => {
      db.rolePermissions.push(...data);
      return Promise.resolve({ count: data.length });
    }
  },
  permission: genericModel('permissions'),
  device: genericModel('devices'),
  notification: genericModel('notifications'),
  file: genericModel('files'),
  auditLog: genericModel('auditLogs'),
  passwordResetToken: genericModel('passwordResetTokens'),
  $transaction: async (input) => {
    if (typeof input === 'function') return input(fakePrisma);
    for (const promise of input) await promise;
    return null;
  },
  $queryRaw: async () => [],
  $disconnect: async () => {}
};
