import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import 'dotenv/config';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: 'users:read', description: 'View any user profile' },
  { key: 'users:create', description: 'Create users' },
  { key: 'users:update', description: 'Update any user' },
  { key: 'users:delete', description: 'Soft-delete users' },
  { key: 'roles:read', description: 'View roles and permissions' },
  { key: 'roles:manage', description: 'Create/update roles and their permissions' },
  { key: 'uploads:create', description: 'Upload files' },
  { key: 'uploads:delete', description: 'Delete any uploaded file' },
  { key: 'notifications:read', description: 'Read own notifications' },
  { key: 'notifications:send', description: 'Send push notifications to users' },
  { key: 'stats:read', description: 'View platform statistics' }
];

const WILDCARD = { key: '*', description: 'All permissions (superadmin)' };

const ROLES = [
  {
    name: 'admin',
    description: 'Full platform access',
    isSystem: true,
    permissions: [WILDCARD.key]
  },
  {
    name: 'manager',
    description: 'Team management access',
    isSystem: false,
    permissions: [
      'users:read',
      'users:create',
      'users:update',
      'uploads:create',
      'notifications:send',
      'stats:read'
    ]
  },
  {
    name: 'user',
    description: 'Default end-user role',
    isSystem: true,
    permissions: ['uploads:create', 'notifications:read']
  }
];

async function seedPermissions() {
  const all = [...PERMISSIONS, WILDCARD];
  for (const permission of all) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission
    });
  }
}

async function seedRoles() {
  const permissionRows = await prisma.permission.findMany();
  const permissionMap = new Map(permissionRows.map((row) => [row.key, row.id]));

  for (const role of ROLES) {
    const roleRow = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description, isSystem: role.isSystem }
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: roleRow.id } });
    await prisma.rolePermission.createMany({
      data: role.permissions.map((key) => ({
        roleId: roleRow.id,
        permissionId: permissionMap.get(key)
      }))
    });
  }
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const passwordHash = await argon2.hash(password);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists, skipping.`);
    return;
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Platform',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      roles: { create: [{ roleId: adminRole.id }] }
    }
  });
  console.log(`Created admin user ${email} with password from ADMIN_PASSWORD.`);
}

async function main() {
  await seedPermissions();
  await seedRoles();
  await seedAdmin();
  console.log('Seed completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
