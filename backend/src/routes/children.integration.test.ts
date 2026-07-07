import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { loginAsRole } from '../test-utils/auth-test-helper';
import { testPrisma, truncateAllTables } from '../test-utils/test-prisma';

const app = createApp(testPrisma);
let agent: request.SuperAgentTest;

const baseInput = {
  dob: '2024-01-01',
  examDate: '2026-01-01',
  weight: 12.2,
  height: 87.8,
  gender: 'Nam' as const,
  tuvan: 'Có' as const,
  labs: {},
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

describe('GET /api/children/search', () => {
  it('unauthenticated → 401', async () => {
    expect((await request(app).get('/api/children/search?q=an')).status).toBe(401);
  });

  it('any authenticated role (incl. dieu_duong) → 200', async () => {
    const nurseAgent = await loginAsRole(app, 'dieu_duong');
    expect((await nurseAgent.get('/api/children/search?q=an')).status).toBe(200);
  });

  it('query shorter than 2 chars → returns empty array, no error', async () => {
    await agent.post('/api/patients').send({ ...baseInput, name: 'An An' });
    const res = await agent.get('/api/children/search?q=a');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('more than 20 matches → capped at 20, startsWith ranked before contains', async () => {
    for (let i = 0; i < 15; i++) {
      await agent.post('/api/patients').send({ ...baseInput, name: `Search Kid ${i}`, examDate: `2026-01-${String(i + 1).padStart(2, '0')}` });
    }
    for (let i = 0; i < 10; i++) {
      await agent.post('/api/patients').send({ ...baseInput, name: `Bé Search ${i}`, examDate: `2026-02-${String(i + 1).padStart(2, '0')}` });
    }
    const res = await agent.get('/api/children/search?q=Search');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(20);
    // the 15 "Search Kid N" (startsWith "Search") should all be present before any "Bé Search N" (contains only) gets cut
    const startsWithCount = res.body.filter((c: { name: string }) => c.name.startsWith('Search')).length;
    expect(startsWithCount).toBe(15);
  });

  it('matched children include lastExamDate for disambiguation', async () => {
    const created = await agent.post('/api/patients').send({ ...baseInput, name: 'Unique Name Xyz' });
    const res = await agent.get('/api/children/search?q=Unique Name');
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(created.body.childId);
    expect(res.body[0].lastExamDate).toContain('2026-01-01');
  });
});

describe('GET /api/children/:id/history', () => {
  it('unknown id → 404', async () => {
    const res = await agent.get('/api/children/does-not-exist/history');
    expect(res.status).toBe(404);
  });

  it('a child with 3 visits → visits ascending by examDate, alerts attached to the right visit', async () => {
    const v1 = await agent.post('/api/patients').send({ ...baseInput, name: 'Trend Kid', examDate: '2026-01-01', weight: 12.3 });
    const childId = v1.body.childId;
    const v2 = await agent
      .post('/api/patients')
      .send({ ...baseInput, name: 'Trend Kid', examDate: '2026-02-01', weight: 12.2, childId });
    await agent.post('/api/patients').send({ ...baseInput, name: 'Trend Kid', examDate: '2026-03-01', weight: 12.5, childId });

    const res = await agent.get(`/api/children/${childId}/history`);
    expect(res.status).toBe(200);
    expect(res.body.child.id).toBe(childId);
    expect(res.body.visits).toHaveLength(3);
    expect(res.body.visits.map((v: { examDate: string }) => v.examDate.slice(0, 10))).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    // v1 -> v2 lost weight (12.3 -> 12.2) => alert keyed on v2's id
    expect(res.body.alerts[v2.body.id]?.some((a: { type: string }) => a.type === 'weight_loss')).toBe(true);
  });
});
