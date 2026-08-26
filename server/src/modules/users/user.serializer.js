export function serializeUserSummary(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    avatarUrl: user.avatarUrl,
    status: user.status,
    createdAt: user.createdAt
  };
}

export function serializeUser(user, { includePermissions = false } = {}) {
  const base = {
    ...serializeUserSummary(user),
    mfaEnabled: Boolean(user.mfaEnabled),
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    updatedAt: user.updatedAt,
    roles: (user.roles || []).map((entry) => ({
      id: entry.role.id,
      name: entry.role.name
    }))
  };

  if (includePermissions) {
    base.permissions = [
      ...new Set(
        (user.roles || []).flatMap((entry) =>
          (entry.role.permissions || []).map((link) => link.permission.key)
        )
      )
    ];
  }

  return base;
}
