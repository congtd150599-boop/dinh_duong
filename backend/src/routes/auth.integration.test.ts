import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { testPrisma, truncateAllTables } from '../test-utils/test-prisma';

const app = createApp(testPrisma);

beforeAll(async () => {
  await truncateAllTables();
});

afterEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

async function createTestUser(overrides: Partial<{ email: string; password: string; isActive: boolean }> = {}) {
  const email = overrides.email ?? 'bacsi.an@test.local';
  const password = overrides.password ?? 'Test1234!';
  const passwordHash = await bcrypt.hash(password, 10);
  await testPrisma.user.create({
    data: { name: 'Bác sĩ An', email, passwordHash, role: 'bac_si', isActive: overrides.isActive ?? true },
  });
  return { email, password };
}

describe('POST /api/auth/login', () => {
  it('correct email + password → 200, sets cookie, returns user (no passwordHash)', async () => {
    const { email, password } = await createTestUser();
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']?.[0]).toContain('dinhduong_session=');
  });

  it('wrong password → 401', async () => {
    const { email } = await createTestUser();
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('unknown email → 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.local', password: 'x' });
    expect(res.status).toBe(401);
  });

  it('deactivated user → 401 even with correct password', async () => {
    const { email, password } = await createTestUser({ email: 'inactive@test.local', isActive: false });
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(401);
  });

  it('malformed payload (missing password) → 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@test.local' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me + POST /api/auth/logout', () => {
  it('me without a session → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('login → me returns the same user → logout → me is 401 again', async () => {
    const { email, password } = await createTestUser();
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email, password });

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(204);

    const meAfter = await agent.get('/api/auth/me');
    expect(meAfter.status).toBe(401);
  });
});
