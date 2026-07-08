import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loginAsRole } from '../test-utils/auth-test-helper';
import { testPrisma, truncateAllTables } from '../test-utils/test-prisma';

const runDatabaseBackupMock = vi.hoisted(() => vi.fn());
const listBackupsMock = vi.hoisted(() => vi.fn());
vi.mock('../services/backup.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/backup.service')>();
  return { ...actual, runDatabaseBackup: runDatabaseBackupMock, listBackups: listBackupsMock };
});

import { createApp } from '../app';

const app = createApp(testPrisma);
let agent: request.SuperAgentTest;

const validPatientInput = {
  name: 'Nguyễn Văn A',
  dob: '2024-01-01',
  examDate: '2026-01-01',
  weight: 12.2,
  height: 87.8,
  gender: 'Nam' as const,
  tuvan: 'Có' as const,
  labs: {},
  representativeGuardian: { relationship: 'Mẹ' as const, name: 'Test Mẹ', email: 'me@test.local', phone: '0900000000' },
};

beforeAll(async () => {
  await truncateAllTables();
});

beforeEach(async () => {
  agent = await loginAsRole(app, 'admin');
  runDatabaseBackupMock.mockReset();
  listBackupsMock.mockReset();
});

afterEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('GET /api/admin/backups', () => {
  it('unauthenticated → 401', async () => {
    expect((await request(app).get('/api/admin/backups')).status).toBe(401);
  });

  it('non-admin → 403', async () => {
    const nurseAgent = await loginAsRole(app, 'dieu_duong');
    expect((await nurseAgent.get('/api/admin/backups')).status).toBe(403);
  });

  it('admin → 200, returns listBackups() result', async () => {
    listBackupsMock.mockResolvedValue([{ fileName: 'backup_x.sql', sizeBytes: 123, createdAt: '2026-01-01T00:00:00.000Z' }]);
    const res = await agent.get('/api/admin/backups');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ fileName: 'backup_x.sql', sizeBytes: 123, createdAt: '2026-01-01T00:00:00.000Z' }]);
  });
});

describe('POST /api/admin/backups', () => {
  it('admin → 201, returns runDatabaseBackup() result', async () => {
    runDatabaseBackupMock.mockResolvedValue({ fileName: 'backup_new.sql', sizeBytes: 456, createdAt: '2026-01-02T00:00:00.000Z' });
    const res = await agent.post('/api/admin/backups');
    expect(res.status).toBe(201);
    expect(res.body.fileName).toBe('backup_new.sql');
    expect(runDatabaseBackupMock).toHaveBeenCalledTimes(1);
  });

  it('bac_si (non-admin) → 403', async () => {
    const docAgent = await loginAsRole(app, 'bac_si');
    expect((await docAgent.post('/api/admin/backups')).status).toBe(403);
  });
});

describe('GET /api/admin/audit-log', () => {
  it('unauthenticated → 401', async () => {
    expect((await request(app).get('/api/admin/audit-log')).status).toBe(401);
  });

  it('dieu_duong → 403', async () => {
    const nurseAgent = await loginAsRole(app, 'dieu_duong');
    expect((await nurseAgent.get('/api/admin/audit-log')).status).toBe(403);
  });

  it('reflects a real mutation made through another route (verifies routes actually call recordAudit)', async () => {
    const created = await agent.post('/api/patients').send(validPatientInput);
    expect(created.status).toBe(201);

    const res = await agent.get('/api/admin/audit-log');
    expect(res.status).toBe(200);
    const entry = res.body.find((e: { action: string }) => e.action === 'patient.create');
    expect(entry).toMatchObject({ targetType: 'Patient', targetId: created.body.id });
    expect(entry.summary).toContain('Nguyễn Văn A');
  });

  it('guardian.update summary shows old → new values per changed field, not a generic message', async () => {
    const created = await agent.post('/api/patients').send(validPatientInput);
    await agent
      .put(`/api/children/${created.body.childId}/guardians`)
      .send({ relationship: 'Mẹ', name: 'Test Mẹ', email: 'new-email@test.local', phone: '0900000000' });

    const res = await agent.get('/api/admin/audit-log');
    const entry = res.body.find((e: { action: string }) => e.action === 'guardian.update');
    expect(entry.summary).toContain('Email: "me@test.local" → "new-email@test.local"');
    // Unchanged fields (name, phone) must NOT show up as a "change".
    expect(entry.summary).not.toContain('Họ tên:');
  });

  it('user.update summary shows old → new role/status, not a generic message', async () => {
    const target = await agent.post('/api/users').send({ name: 'Test Target', email: 'target@test.local', password: 'Test1234!', role: 'dieu_duong' });
    await agent.patch(`/api/users/${target.body.id}`).send({ role: 'bac_si', isActive: false });

    const res = await agent.get('/api/admin/audit-log');
    const entry = res.body.find((e: { action: string }) => e.action === 'user.update');
    expect(entry.summary).toContain('Vai trò: "dieu_duong" → "bac_si"');
    expect(entry.summary).toContain('Trạng thái: "Đang hoạt động" → "Đã vô hiệu hóa"');
  });

  it('food.update summary shows old → new values per changed field', async () => {
    const created = await agent
      .post('/api/foods')
      .send({ name: 'Test Food Diff', category: 'Khác', kcalPer100: 100, proteinPer100: 5, carbPer100: 10, fatPer100: 2 });
    await agent.patch(`/api/foods/${created.body.id}`).send({ kcalPer100: 150 });

    const res = await agent.get('/api/admin/audit-log');
    const entry = res.body.find((e: { action: string }) => e.action === 'food.update');
    expect(entry.summary).toContain('Kcal/100g: "100" → "150"');
    expect(entry.summary).not.toContain('Tên:');
  });
});
