import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp, seed, registerAndLogin, grantPermission, ids } from './helpers/fixtures.js';

describe('RBAC authorization', () => {
  let app;

  beforeEach(() => {
    seed();
    app = buildApp();
  });

  it('denies users:read to a freshly registered user', async () => {
    const user = await registerAndLogin(app);
    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${user.accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body.message).toContain('users:read');
  });

  it('allows the endpoint once the permission is granted', async () => {
    const user = await registerAndLogin(app);
    grantPermission(user.userId, 'users:read');

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${user.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });

  it('wildcard permission (*) grants everything', async () => {
    const admin = await registerAndLogin(app, { email: 'boss@example.com' });
    grantPermission(admin.userId, '*');

    const created = await request(app)
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        firstName: 'Managed',
        lastName: 'Person',
        email: 'managed@example.com',
        password: 'AnotherPass123!',
        roleIds: [ids.userRoleId]
      });
    expect(created.status).toBe(201);
    expect(created.body.data.roles[0].name).toBe('user');
  });

  it('blocks self-deletion even with wildcard permission', async () => {
    const admin = await registerAndLogin(app);
    grantPermission(admin.userId, '*');

    const res = await request(app)
      .delete(`/api/v1/users/${admin.userId}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('own account');
  });

  it('roles catalog requires roles:read', async () => {
    const user = await registerAndLogin(app);
    const denied = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${user.accessToken}`);
    expect(denied.status).toBe(403);

    grantPermission(user.userId, 'roles:read');
    const allowed = await request(app)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${user.accessToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.map((role) => role.name)).toEqual(expect.arrayContaining(['admin', 'user']));
  });

  it('stats overview requires stats:read', async () => {
    const user = await registerAndLogin(app);
    const denied = await request(app)
      .get('/api/v1/stats/overview')
      .set('Authorization', `Bearer ${user.accessToken}`);
    expect(denied.status).toBe(403);

    grantPermission(user.userId, 'stats:read');
    const allowed = await request(app)
      .get('/api/v1/stats/overview')
      .set('Authorization', `Bearer ${user.accessToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.totals.users).toBeGreaterThanOrEqual(1);
  });
});
