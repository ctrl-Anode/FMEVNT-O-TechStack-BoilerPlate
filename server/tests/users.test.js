import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp, seed, registerAndLogin, grantPermission, db, ids } from './helpers/fixtures.js';

describe('users module', () => {
  let app;

  beforeEach(() => {
    seed();
    app = buildApp();
  });

  async function seedUsers(count) {
    for (let index = 0; index < count; index += 1) {
      db.users.push({
        id: `seeded_${index}`,
        email: `seeded${index}@example.com`,
        firstName: `First${index}`,
        lastName: 'Seeded',
        status: 'ACTIVE',
        createdAt: new Date(Date.now() - index * 60000),
        updatedAt: new Date()
      });
      db.userRoles.push({ userId: `seeded_${index}`, roleId: ids.userRoleId });
    }
  }

  it('paginates, sorts and filters', async () => {
    await seedUsers(25);
    const admin = await registerAndLogin(app);
    grantPermission(admin.userId, 'users:read');

    const page2 = await request(app)
      .get('/api/v1/users?limit=10&page=2&sort=-createdAt')
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(page2.status).toBe(200);
    expect(page2.body.data).toHaveLength(10);
    expect(page2.body.meta.totalPages).toBe(Math.ceil(26 / 10));
    expect(new Date(page2.body.data[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(page2.body.data[9].createdAt).getTime()
    );

    const filtered = await request(app)
      .get('/api/v1/users?q=seeded3')
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.every((user) => user.email.includes('seeded3'))).toBe(true);
  });

  it('updates another user fields and roles', async () => {
    const target = await registerAndLogin(app, { email: 'target@example.com' });
    const admin = await registerAndLogin(app, { email: 'admin2@example.com' });
    grantPermission(admin.userId, 'users:update');

    const res = await request(app)
      .patch(`/api/v1/users/${target.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ firstName: 'Renamed', roleIds: [ids.userRoleId] });
    expect(res.status).toBe(200);
    expect(res.body.data.firstName).toBe('Renamed');
  });

  it('profile endpoints work for any authenticated user', async () => {
    const user = await registerAndLogin(app);

    const me = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${user.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(user.email);

    const patched = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ firstName: 'Newname' });
    expect(patched.status).toBe(200);
    expect(patched.body.data.firstName).toBe('Newname');
  });

  it('search falls back to SQL when Meilisearch disabled', async () => {
    await seedUsers(5);
    const user = await registerAndLogin(app);

    const res = await request(app)
      .get('/api/v1/search/users?q=First4')
      .set('Authorization', `Bearer ${user.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((row) => row.firstName === 'First4')).toBe(true);
  });

  it('notifications feed returns own rows only', async () => {
    const user = await registerAndLogin(app);
    db.notifications.push({
      id: 'n1',
      userId: user.userId,
      channel: 'PUSH',
      title: 'Hello',
      body: 'World',
      readAt: null,
      createdAt: new Date()
    });
    db.notifications.push({
      id: 'n2-other',
      userId: 'someone-else',
      channel: 'PUSH',
      title: 'Not yours',
      body: 'Hidden',
      readAt: null,
      createdAt: new Date()
    });

    const res = await request(app)
      .get('/api/v1/notifications/me')
      .set('Authorization', `Bearer ${user.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.unread).toBe(1);
  });
});
