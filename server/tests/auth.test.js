import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { authenticator } from 'otplib';
import { buildApp, seed, registerAndLogin } from './helpers/fixtures.js';

describe('auth module', () => {
  let app;

  beforeEach(() => {
    seed();
    app = buildApp();
  });

  describe('register', () => {
    it('creates an account and returns a token pair', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        password: 'Sup3rSecurePass!'
      });
      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe('ada@example.com');
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.refreshToken).toHaveLength(96);
    });

    it('rejects duplicate emails with 409', async () => {
      const payload = { firstName: 'Dup', lastName: 'User', email: 'dup@example.com', password: 'Sup3rSecurePass!' };
      await request(app).post('/api/v1/auth/register').send(payload);
      const res = await request(app).post('/api/v1/auth/register').send(payload);
      expect(res.status).toBe(409);
    });

    it('rejects weak passwords with field details', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'weak@example.com',
        password: 'short'
      });
      expect(res.status).toBe(422);
      expect(res.body.details.password).toBeTruthy();
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      const user = await registerAndLogin(app);
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.id).toBe(user.userId);
    });

    it('rejects wrong password with 401 INVALID_CREDENTIALS', async () => {
      const user = await registerAndLogin(app);
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: 'WrongPassword123' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('me', () => {
    it('requires a bearer token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns profile with permissions', async () => {
      const user = await registerAndLogin(app);
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${user.accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.user.permissions).toContain('uploads:create');
      expect(res.body.data.user.roles.map((role) => role.name ?? role.role?.name)).toContain('user');
    });
  });

  describe('refresh rotation', () => {
    it('rotates tokens and invalidates the old refresh token', async () => {
      const user = await registerAndLogin(app);

      const first = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      expect(first.status).toBe(200);
      expect(first.body.data.refreshToken).not.toBe(user.refreshToken);

      const reuse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      expect(reuse.status).toBe(401);
      expect(reuse.body.code).toBe('REFRESH_TOKEN_INVALID');
    });
  });

  describe('logout', () => {
    it('revokes the session so refresh fails afterwards', async () => {
      const user = await registerAndLogin(app);

      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ refreshToken: user.refreshToken });
      expect(logoutRes.status).toBe(200);

      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: user.refreshToken });
      expect(refreshRes.status).toBe(401);
    });
  });

  describe('password reset flow', () => {
    it('forgot-password always succeeds without leaking existence', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ghost@example.com' });
      expect(res.status).toBe(200);
    });

    it('reset-password rejects garbage tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: 'x'.repeat(20), password: 'AnotherSecure123' });
      expect(res.status).toBe(400);
    });
  });

  describe('MFA (TOTP)', () => {
    it('setup -> confirm -> login requires code -> verify completes login', async () => {
      const user = await registerAndLogin(app);

      const setupRes = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${user.accessToken}`);
      expect(setupRes.status).toBe(200);
      expect(setupRes.body.data.otpauth).toContain('otpauth://totp');

      const secret = setupRes.body.data.secret;
      const confirmRes = await request(app)
        .post('/api/v1/auth/mfa/confirm')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ code: authenticator.generate(secret) });
      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.mfaEnabled).toBe(true);

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.mfaRequired).toBe(true);
      expect(loginRes.body.data.mfaToken).toBeTruthy();

      const verifyRes = await request(app).post('/api/v1/auth/mfa/verify').send({
        mfaToken: loginRes.body.data.mfaToken,
        code: authenticator.generate(secret)
      });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.accessToken).toBeTruthy();
    });

    it('rejects invalid codes during verification', async () => {
      const user = await registerAndLogin(app);
      const setupRes = await request(app)
        .post('/api/v1/auth/mfa/setup')
        .set('Authorization', `Bearer ${user.accessToken}`);
      const secret = setupRes.body.data.secret;
      await request(app)
        .post('/api/v1/auth/mfa/confirm')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ code: authenticator.generate(secret) });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: user.email, password: user.password });

      const badVerify = await request(app).post('/api/v1/auth/mfa/verify').send({
        mfaToken: loginRes.body.data.mfaToken,
        code: '000000'
      });
      expect(badVerify.status).toBe(401);
    });
  });
});
