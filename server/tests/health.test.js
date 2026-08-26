import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp, seed } from './helpers/fixtures.js';

describe('health & root', () => {
  let app;

  beforeEach(() => {
    seed();
    app = buildApp();
  });

  it('GET /healthz reports ok', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /readyz checks database and redis', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
    expect(res.body.checks.database).toBe(true);
    expect(res.body.checks.redis).toBe(true);
  });

  it('GET /api/v1 returns service info', async () => {
    const res = await request(app).get('/api/v1');
    expect(res.status).toBe(200);
    expect(res.body.docs).toBe('/api/docs');
  });

  it('unknown route returns structured 404', async () => {
    const res = await request(app).get('/api/v1/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
