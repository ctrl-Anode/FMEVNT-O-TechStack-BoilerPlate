import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'mysql://root:root@127.0.0.1:3306/app_test';
process.env.REDIS_URL ||= 'redis://127.0.0.1:6379';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret-value-with-at-least-32-chars!!';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret-value-with-at-least-32-charss!';
process.env.MFA_TOKEN_SECRET ||= 'test-mfa-secret-value-with-at-least-32-chars!!!';
process.env.MEILI_ENABLED = 'false';
process.env.WORKER_MODE = 'off';
process.env.MAIL_DRIVER = 'log';
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_LOCAL_PATH = './storage';
process.env.LOG_LEVEL = 'silent';

vi.mock('../src/lib/prisma.js', async () => {
  const { fakePrisma } = await import('./helpers/fake-prisma.js');
  return { PrismaClient: class {}, prisma: fakePrisma };
});

vi.mock('../src/lib/redis.js', () => ({
  redis: {
    get: vi.fn(async () => null),
    set: vi.fn(async () => 'OK'),
    del: vi.fn(async () => 1),
    scan: vi.fn(async () => ['0', []]),
    ping: vi.fn(async () => 'PONG'),
    call: vi.fn(async () => [0, '0']),
    quit: vi.fn(async () => {}),
    status: 'ready',
    on: vi.fn()
  }
}));

vi.mock('../src/lib/meilisearch.js', () => ({
  meili: null,
  USERS_INDEX: 'users',
  ensureUsersIndex: vi.fn(async () => null)
}));
