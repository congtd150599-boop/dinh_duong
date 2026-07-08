import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { loginAsRole } from '../test-utils/auth-test-helper';
import { testPrisma, truncateAllTables } from '../test-utils/test-prisma';

const app = createApp(testPrisma);
let agent: request.SuperAgentTest;

const validInput = {
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
  agent = await loginAsRole(app, 'bac_si');
});

afterEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('GET /api/reports/clinic-stats', () => {
  it('unauthenticated → 401', async () => {
    expect((await request(app).get('/api/reports/clinic-stats')).status).toBe(401);
  });

  it('any authenticated role (incl. dieu_duong) → 200', async () => {
    const nurseAgent = await loginAsRole(app, 'dieu_duong');
    expect((await nurseAgent.get('/api/reports/clinic-stats')).status).toBe(200);
  });

  it('no patients → empty monthly array, zero intervention totals', async () => {
    const res = await agent.get('/api/reports/clinic-stats');
    expect(res.status).toBe(200);
    expect(res.body.monthly).toEqual([]);
    expect(res.body.intervention.totalChildrenWithMultipleVisits).toBe(0);
  });

  it('reflects a created patient in the monthly breakdown', async () => {
    await agent.post('/api/patients').send(validInput);

    const res = await agent.get('/api/reports/clinic-stats');

    expect(res.body.monthly).toHaveLength(1);
    expect(res.body.monthly[0].month).toBe('2026-01');
    expect(res.body.monthly[0].total).toBe(1);
  });
});
