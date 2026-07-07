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

  it('matched children include lastExamDate and hasQualifyingGuardian for disambiguation', async () => {
    const created = await agent.post('/api/patients').send({ ...baseInput, name: 'Unique Name Xyz' });
    const res = await agent.get('/api/children/search?q=Unique Name');
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(created.body.childId);
    expect(res.body[0].lastExamDate).toContain('2026-01-01');
    expect(res.body[0].hasQualifyingGuardian).toBe(true);
  });
});

describe('GET /api/children/:id/history', () => {
  it('unknown id → 404', async () => {
    const res = await agent.get('/api/children/does-not-exist/history');
    expect(res.status).toBe(404);
  });

  it('a child with 3 visits → visits ascending by examDate, alerts attached to the right visit, guardians included', async () => {
    const v1 = await agent.post('/api/patients').send({ ...baseInput, name: 'Trend Kid', examDate: '2026-01-01', weight: 12.3 });
    const childId = v1.body.childId;
    const v2 = await agent
      .post('/api/patients')
      .send({ ...baseInput, name: 'Trend Kid', examDate: '2026-02-01', weight: 12.2, childId, representativeGuardian: null });
    await agent
      .post('/api/patients')
      .send({ ...baseInput, name: 'Trend Kid', examDate: '2026-03-01', weight: 12.5, childId, representativeGuardian: null });

    const res = await agent.get(`/api/children/${childId}/history`);
    expect(res.status).toBe(200);
    expect(res.body.child.id).toBe(childId);
    expect(res.body.visits).toHaveLength(3);
    expect(res.body.visits.map((v: { examDate: string }) => v.examDate.slice(0, 10))).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    expect(res.body.guardians).toHaveLength(1);
    expect(res.body.guardians[0].relationship).toBe('Mẹ');
    // v1 -> v2 lost weight (12.3 -> 12.2) => alert keyed on v2's id
    expect(res.body.alerts[v2.body.id]?.some((a: { type: string }) => a.type === 'weight_loss')).toBe(true);
  });
});

describe('PUT /api/children/:id/guardians', () => {
  it('adds "Bố" alongside an existing "Mẹ" — both persist independently', async () => {
    const created = await agent.post('/api/patients').send({ ...baseInput, name: 'Contact Kid' });
    const res = await agent
      .put(`/api/children/${created.body.childId}/guardians`)
      .send({ relationship: 'Bố', name: 'Test Bố', email: 'bo@test.local', phone: '0911111111' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const history = await agent.get(`/api/children/${created.body.childId}/history`);
    const relationships = history.body.guardians.map((g: { relationship: string }) => g.relationship).sort();
    expect(relationships).toEqual(['Bố', 'Mẹ']);
  });

  it('updating "Mẹ" again does not touch "Bố"', async () => {
    const created = await agent.post('/api/patients').send({ ...baseInput, name: 'Contact Kid 2' });
    await agent.put(`/api/children/${created.body.childId}/guardians`).send({ relationship: 'Bố', name: 'Test Bố', email: 'bo2@test.local', phone: '0911111112' });
    await agent.put(`/api/children/${created.body.childId}/guardians`).send({ relationship: 'Mẹ', address: '123 Đường ABC' });

    const history = await agent.get(`/api/children/${created.body.childId}/history`);
    const father = history.body.guardians.find((g: { relationship: string }) => g.relationship === 'Bố');
    expect(father.email).toBe('bo2@test.local');
    const mother = history.body.guardians.find((g: { relationship: string }) => g.relationship === 'Mẹ');
    expect(mother.address).toBe('123 Đường ABC');
    expect(mother.email).toBe('me@test.local'); // unchanged
  });

  it('clearing the email of the ONLY qualifying guardian → 400, nothing saved', async () => {
    const created = await agent.post('/api/patients').send({ ...baseInput, name: 'Contact Kid 3' });
    const res = await agent.put(`/api/children/${created.body.childId}/guardians`).send({ relationship: 'Mẹ', email: null });
    expect(res.status).toBe(400);

    const history = await agent.get(`/api/children/${created.body.childId}/history`);
    expect(history.body.guardians.find((g: { relationship: string }) => g.relationship === 'Mẹ').email).toBe('me@test.local');
  });

  it('clearing one guardian is fine if another still qualifies', async () => {
    const created = await agent.post('/api/patients').send({ ...baseInput, name: 'Contact Kid 4' });
    await agent.put(`/api/children/${created.body.childId}/guardians`).send({ relationship: 'Bố', name: 'Test Bố', email: 'bo4@test.local', phone: '0911111114' });
    const res = await agent.put(`/api/children/${created.body.childId}/guardians`).send({ relationship: 'Mẹ', email: null, phone: null });
    expect(res.status).toBe(200);
  });

  it('unknown child id → 404', async () => {
    const res = await agent.put('/api/children/does-not-exist/guardians').send({ relationship: 'Mẹ', name: 'X', email: 'x@test.local', phone: '0900000009' });
    expect(res.status).toBe(404);
  });
});
