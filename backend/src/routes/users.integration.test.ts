import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { loginAsRole } from '../test-utils/auth-test-helper';
import { testPrisma, truncateAllTables } from '../test-utils/test-prisma';

const app = createApp(testPrisma);
let adminAgent: request.SuperAgentTest;

beforeAll(async () => {
  await truncateAllTables();
});

beforeEach(async () => {
  adminAgent = await loginAsRole(app, 'admin');
});

afterEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('role enforcement', () => {
  it('bac_si → 403 on every /api/users route', async () => {
    const doctorAgent = await loginAsRole(app, 'bac_si');
    expect((await doctorAgent.get('/api/users')).status).toBe(403);
    expect((await doctorAgent.post('/api/users').send({})).status).toBe(403);
  });

  it('dieu_duong → 403', async () => {
    const nurseAgent = await loginAsRole(app, 'dieu_duong');
    expect((await nurseAgent.get('/api/users')).status).toBe(403);
  });

  it('unauthenticated → 401', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401);
  });
});

describe('POST /api/users (create)', () => {
  it('creates a user and it appears in the list', async () => {
    const res = await adminAgent.post('/api/users').send({
      name: 'Điều dưỡng Bình',
      email: 'dieuduong.binh@test.local',
      password: 'Password123!',
      role: 'dieu_duong',
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('dieu_duong');
    expect(res.body.passwordHash).toBeUndefined();

    const list = await adminAgent.get('/api/users');
    expect(list.body.some((u: { email: string }) => u.email === 'dieuduong.binh@test.local')).toBe(true);
  });

  it('duplicate email → 409', async () => {
    const payload = { name: 'A', email: 'dup@test.local', password: 'Password123!', role: 'bac_si' as const };
    await adminAgent.post('/api/users').send(payload);
    const res = await adminAgent.post('/api/users').send(payload);
    expect(res.status).toBe(409);
  });

  it('password shorter than 8 chars → 400', async () => {
    const res = await adminAgent.post('/api/users').send({ name: 'A', email: 'short@test.local', password: 'short', role: 'bac_si' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/users/:id (update)', () => {
  it('updates role and isActive', async () => {
    const created = await adminAgent
      .post('/api/users')
      .send({ name: 'Bác sĩ X', email: 'bacsi.x@test.local', password: 'Password123!', role: 'bac_si' });

    const res = await adminAgent.patch(`/api/users/${created.body.id}`).send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it('cannot deactivate the last remaining active admin', async () => {
    // adminAgent's own account is the only active admin in this fresh test DB.
    const me = await adminAgent.get('/api/auth/me');
    const res = await adminAgent.patch(`/api/users/${me.body.user.id}`).send({ isActive: false });
    expect(res.status).toBe(400);
  });

  it('cannot deactivate your own account even when another admin exists', async () => {
    const me = await adminAgent.get('/api/auth/me');
    await adminAgent.post('/api/users').send({ name: 'Admin 2', email: 'admin2@test.local', password: 'Password123!', role: 'admin' });

    const res = await adminAgent.patch(`/api/users/${me.body.user.id}`).send({ isActive: false });
    expect(res.status).toBe(400);
  });

  it('can deactivate a different admin when another active admin remains', async () => {
    const other = await adminAgent
      .post('/api/users')
      .send({ name: 'Admin 2', email: 'admin2b@test.local', password: 'Password123!', role: 'admin' });

    const res = await adminAgent.patch(`/api/users/${other.body.id}`).send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it('unknown id → 404', async () => {
    const res = await adminAgent.patch('/api/users/does-not-exist').send({ isActive: false });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/users/:id/reset-password', () => {
  it('resets the password and the user can log in with the new one', async () => {
    const created = await adminAgent
      .post('/api/users')
      .send({ name: 'Bác sĩ Y', email: 'bacsi.y@test.local', password: 'OldPassword1!', role: 'bac_si' });

    const reset = await adminAgent.post(`/api/users/${created.body.id}/reset-password`).send({ newPassword: 'NewPassword1!' });
    expect(reset.status).toBe(204);

    const login = await request(app).post('/api/auth/login').send({ email: 'bacsi.y@test.local', password: 'NewPassword1!' });
    expect(login.status).toBe(200);
  });
});
