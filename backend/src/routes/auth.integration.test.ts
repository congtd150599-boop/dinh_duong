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

async function createTestUser(overrides: Partial<{ email: string; password: string; status: string }> = {}) {
  const email = overrides.email ?? 'bacsi.an@test.local';
  const password = overrides.password ?? 'Test1234!';
  const passwordHash = await bcrypt.hash(password, 10);
  await testPrisma.user.create({
    data: { name: 'Bác sĩ An', email, passwordHash, role: 'bac_si', status: overrides.status ?? 'active' },
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
    const { email, password } = await createTestUser({ email: 'inactive@test.local', status: 'disabled' });
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(401);
  });

  it('pending (self-registered, not yet approved) user → 401 with a distinct message, even with correct password', async () => {
    const { email, password } = await createTestUser({ email: 'pending@test.local', status: 'pending' });
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('chờ');
  });

  it('malformed payload (missing password) → 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@test.local' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/register', () => {
  it('creates a pending account, does not log in, and never lets the caller pick a role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Điều dưỡng Mới', email: 'newnurse@test.local', password: 'Test1234!', role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.headers['set-cookie']).toBeUndefined();

    const created = await testPrisma.user.findUnique({ where: { email: 'newnurse@test.local' } });
    expect(created).toMatchObject({ role: 'dieu_duong', status: 'pending' });

    const loginAttempt = await request(app).post('/api/auth/login').send({ email: 'newnurse@test.local', password: 'Test1234!' });
    expect(loginAttempt.status).toBe(401);
  });

  it('duplicate email → 409', async () => {
    await createTestUser({ email: 'dup-register@test.local' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'dup-register@test.local', password: 'Test1234!' });
    expect(res.status).toBe(409);
  });

  it('password shorter than 8 chars → 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'short-pw@test.local', password: 'short' });
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
