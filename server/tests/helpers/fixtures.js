import crypto from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db, resetDb } from './fake-prisma.js';
import { PERMISSIONS } from '../../src/config/constants.js';

export { db, resetDb };

export const ids = {
  adminRoleId: '',
  userRoleId: ''
};

export function buildApp() {
  return createApp();
}

export function seed() {
  resetDb();

  for (const permission of PERMISSIONS) {
    db.permissions.push({
      id: `perm_${permission.key}`,
      key: permission.key,
      description: permission.description
    });
  }
  db.permissions.push({ id: 'perm_wildcard', key: '*', description: 'All permissions' });

  ids.adminRoleId = crypto.randomUUID();
  ids.userRoleId = crypto.randomUUID();

  db.roles.push({
    id: ids.adminRoleId,
    name: 'admin',
    description: 'Administrator',
    isSystem: true,
    createdAt: new Date()
  });
  db.roles.push({
    id: ids.userRoleId,
    name: 'user',
    description: 'Default role',
    isSystem: true,
    createdAt: new Date()
  });

  db.rolePermissions.push({ roleId: ids.adminRoleId, permissionId: 'perm_wildcard' });
  db.rolePermissions.push({ roleId: ids.userRoleId, permissionId: 'perm_uploads:create' });
  db.rolePermissions.push({ roleId: ids.userRoleId, permissionId: 'perm_notifications:read' });

  return ids;
}

let counter = 0;

export async function registerAndLogin(app, overrides = {}) {
  counter += 1;
  const payload = {
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    email: overrides.email || `user${counter}@example.com`,
    password: overrides.password || 'Sup3rSecurePass!'
  };

  const response = await request(app).post('/api/v1/auth/register').send(payload);
  if (response.status !== 201) {
    throw new Error(`register failed (${response.status}): ${JSON.stringify(response.body)}`);
  }

  return {
    email: payload.email,
    password: payload.password,
    userId: response.body.data.user.id,
    accessToken: response.body.data.accessToken,
    refreshToken: response.body.data.refreshToken
  };
}

export function grantPermission(userId, permissionKey) {
  const permission = db.permissions.find((entry) => entry.key === permissionKey);
  if (!permission) throw new Error(`Unknown permission ${permissionKey}`);
  for (const link of db.userRoles.filter((entry) => entry.userId === userId)) {
    if (!db.rolePermissions.some((rp) => rp.roleId === link.roleId && rp.permissionId === permission.id)) {
      db.rolePermissions.push({ roleId: link.roleId, permissionId: permission.id });
    }
  }
}

export function attachRole(userId, roleId) {
  if (!db.userRoles.some((link) => link.userId === userId && link.roleId === roleId)) {
    db.userRoles.push({ userId, roleId });
  }
}
