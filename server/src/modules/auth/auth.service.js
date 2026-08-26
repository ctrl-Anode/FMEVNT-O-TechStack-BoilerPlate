import { authenticator } from 'otplib';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import {
  generateOpaqueToken,
  hashRefreshToken,
  hashResetToken,
  signAccessToken,
  signMfaToken,
  verifyMfaToken
} from '../../utils/tokens.js';
import { DEFAULT_ROLE, USER_STATUS } from '../../config/constants.js';
import { queueEmail } from '../../queues/jobs.js';
import { logAudit } from '../../services/audit.js';
import { loadUserWithPermissions } from '../../middleware/authenticate.js';

const MFA_ISSUER = 'Acme Platform';

async function issueSession(user, meta = {}) {
  const refreshToken = generateOpaqueToken();
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgent: String(meta.userAgent || '').slice(0, 250),
      ip: meta.ip,
      expiresAt: new Date(Date.now() + config.JWT_REFRESH_TTL * 1000)
    }
  });

  return {
    sessionId: session.id,
    accessToken: signAccessToken(user, session.id),
    refreshToken,
    expiresIn: config.JWT_ACCESS_TTL
  };
}

function authPayload(tokens, user) {
  return {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    tokenType: 'Bearer',
    expiresIn: tokens.expiresIn
  };
}

async function findUserWithRoles(where) {
  return prisma.user.findFirst({
    where: { ...where, deletedAt: null },
    include: { roles: { select: { role: { select: { id: true, name: true } } } } }
  });
}

export async function register(input, meta) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const role = await prisma.role.findUnique({ where: { name: DEFAULT_ROLE } });
  if (!role) throw new Error(`Default role "${DEFAULT_ROLE}" missing. Run the seed.`);

  const created = await prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      roles: { create: [{ roleId: role.id }] }
    },
    include: { roles: { select: { role: { select: { id: true, name: true } } } } }
  });

  queueEmail('welcome', created.email, { firstName: created.firstName });
  logAudit({
    userId: created.id,
    action: 'auth.register',
    entity: 'user',
    entityId: created.id,
    ip: meta.ip
  });

  const tokens = await issueSession(created, meta);
  return authPayload(tokens, created);
}

export async function login({ email, password }, meta) {
  const user = await findUserWithRoles({ email });
  if (!user || !user.passwordHash) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    logAudit({ userId: user.id, action: 'auth.login_failed', ip: meta.ip });
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (user.status === USER_STATUS.SUSPENDED) throw ApiError.forbidden('This account has been suspended');
  if (user.status === USER_STATUS.INACTIVE) throw ApiError.forbidden('This account is inactive');

  if (user.mfaEnabled) {
    return { mfaRequired: true, mfaToken: signMfaToken(user.id) };
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  logAudit({ userId: user.id, action: 'auth.login', ip: meta.ip, meta: { userAgent: meta.userAgent } });

  const tokens = await issueSession(user, meta);
  return authPayload(tokens, user);
}

export async function verifyMfa({ mfaToken, code }, meta) {
  let payload;
  try {
    payload = verifyMfaToken(mfaToken);
  } catch {
    throw ApiError.unauthorized('MFA session expired, please sign in again', 'MFA_TOKEN_INVALID');
  }

  const user = await findUserWithRoles({ id: payload.sub });
  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    throw ApiError.unauthorized('MFA is not active for this account', 'MFA_TOKEN_INVALID');
  }

  const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
  if (!valid) throw ApiError.unauthorized('Invalid authentication code', 'INVALID_CREDENTIALS');

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  logAudit({ userId: user.id, action: 'auth.login_mfa', ip: meta.ip });

  const tokens = await issueSession(user, meta);
  return authPayload(tokens, user);
}

export async function refresh(refreshToken, meta) {
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashRefreshToken(refreshToken) },
    include: { user: true }
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token is invalid or expired', 'REFRESH_TOKEN_INVALID');
  }
  if (session.user.deletedAt || session.user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.unauthorized('Account is no longer active', 'ACCOUNT_DISABLED');
  }

  const newRefreshToken = generateOpaqueToken();
  const rotated = await prisma.$transaction(async (tx) => {
    await tx.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    return tx.session.create({
      data: {
        userId: session.userId,
        refreshTokenHash: hashRefreshToken(newRefreshToken),
        userAgent: String(meta.userAgent || '').slice(0, 250),
        ip: meta.ip,
        expiresAt: new Date(Date.now() + config.JWT_REFRESH_TTL * 1000)
      }
    });
  });

  const user = await findUserWithRoles({ id: session.userId });
  const tokens = {
    accessToken: signAccessToken(user, rotated.id),
    refreshToken: newRefreshToken,
    expiresIn: config.JWT_ACCESS_TTL
  };
  return authPayload(tokens, user);
}

export async function logout(refreshToken, userId) {
  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: hashRefreshToken(refreshToken) }
  });
  if (!session || session.revokedAt) return;

  await prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  logAudit({ userId, action: 'auth.logout' });
}

export async function logoutAll(userId) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() }
  });
  logAudit({ userId, action: 'auth.logout_all' });
}

export async function me(userId) {
  const profile = await loadUserWithPermissions(userId);
  if (!profile) throw ApiError.notFound('User not found');

  const full = await prisma.user.findUnique({
    where: { id: userId },
    include: { roles: { select: { role: { select: { id: true, name: true } } } } }
  });

  return { ...full, permissions: profile.permissions };
}

export async function forgotPassword(email) {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });

  if (user && user.passwordHash) {
    const token = generateOpaqueToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    });
    const resetUrl = `${config.CLIENT_URL}/reset-password?token=${token}`;
    queueEmail('reset_password', user.email, { firstName: user.firstName, resetUrl });
  }

  return { queued: true };
}

export async function resetPassword({ token, password }) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) }
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw ApiError.badRequest('Reset token is invalid or expired');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash },
    include: { roles: { select: { role: { select: { id: true, name: true } } } } }
  });

  await prisma.$transaction([
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() }
    })
  ]);

  queueEmail('password_changed', user.email, { firstName: user.firstName });
  logAudit({ userId: record.userId, action: 'auth.reset_password' });
  return { reset: true };
}

export async function changePassword(userId, { currentPassword, newPassword }, currentSessionId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) throw ApiError.badRequest('Password login is not available for this account');

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) throw ApiError.badRequest('Current password is incorrect');

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } }),
    prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {})
      },
      data: { revokedAt: new Date() }
    })
  ]);

  queueEmail('password_changed', user.email, { firstName: user.firstName });
  logAudit({ userId, action: 'auth.change_password' });
  return { changed: true };
}

export async function setupMfa(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.mfaEnabled) throw ApiError.conflict('MFA is already enabled');

  const secret = authenticator.generateSecret();
  await prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret } });

  return { secret, otpauth: authenticator.keyuri(user.email, MFA_ISSUER, secret) };
}

export async function confirmMfa(userId, code) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user.mfaEnabled) throw ApiError.conflict('MFA is already enabled');
  if (!user.mfaSecret) throw ApiError.badRequest('Start MFA setup first');

  const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
  if (!valid) throw ApiError.badRequest('Invalid code, check your authenticator app');

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
  logAudit({ userId, action: 'auth.mfa_enabled' });
  return { mfaEnabled: true };
}

export async function disableMfa(userId, { password, code }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.mfaEnabled) throw ApiError.conflict('MFA is not enabled');

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) throw ApiError.badRequest('Password is incorrect');

  const codeValid = authenticator.verify({ token: code, secret: user.mfaSecret });
  if (!codeValid) throw ApiError.badRequest('Invalid authentication code');

  await prisma.user.update({ where: { id: userId }, data: { mfaEnabled: false, mfaSecret: null } });
  logAudit({ userId, action: 'auth.mfa_disabled' });
  return { mfaEnabled: false };
}
