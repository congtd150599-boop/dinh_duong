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
};

beforeAll(async () => {
  await truncateAllTables();
});

beforeEach(async () => {
  // afterEach truncates the User table too, so a fresh logged-in agent is
  // needed for every test.
  agent = await loginAsRole(app, 'bac_si');
});

afterEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('POST /api/assessments', () => {
  it('valid payload → 200 with expected fields, does not persist', async () => {
    const res = await agent.post('/api/assessments').send(validInput);
    expect(res.status).toBe(200);
    expect(res.body.wfa).toBe('Bình thường');
    expect(res.body.targetEnergy).toBe(1200);

    const list = await agent.get('/api/patients');
    expect(list.body).toHaveLength(0);
  });

  it('missing required field (name) → 400', async () => {
    const { name, ...rest } = validInput;
    const res = await agent.post('/api/assessments').send(rest);
    expect(res.status).toBe(400);
  });

  it('malformed type (weight as string) → 400, not 500', async () => {
    const res = await agent.post('/api/assessments').send({ ...validInput, weight: '12.2' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/patients + GET /api/patients', () => {
  it('creates a patient (201) and it appears in the subsequent list', async () => {
    const createRes = await agent.post('/api/patients').send(validInput);
    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.wfa).toBe('Bình thường');

    const listRes = await agent.get('/api/patients');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].name).toBe('Nguyễn Văn A');
    expect(listRes.body[0].stt).toBe(1);
  });

  it('rejects invalid payload with 400 and does not create a row', async () => {
    const res = await agent.post('/api/patients').send({ ...validInput, weight: -5 });
    expect(res.status).toBe(400);
    const listRes = await agent.get('/api/patients');
    expect(listRes.body).toHaveLength(0);
  });

  it('no childId, brand-new name/dob → auto-creates a Child, returned in the response', async () => {
    const res = await agent.post('/api/patients').send(validInput);
    expect(res.status).toBe(201);
    expect(res.body.childId).toBeDefined();
  });

  it('same name (different casing/whitespace) + same dob, no childId → reuses the same Child', async () => {
    const first = await agent.post('/api/patients').send(validInput);
    const second = await agent.post('/api/patients').send({
      ...validInput,
      name: '  nguyễn   văn a  ',
      examDate: '2026-06-01',
    });
    expect(second.status).toBe(201);
    expect(second.body.childId).toBe(first.body.childId);
  });

  it('explicit childId from a prior visit, different typed name → attaches to the given childId', async () => {
    const first = await agent.post('/api/patients').send(validInput);
    const second = await agent.post('/api/patients').send({
      ...validInput,
      name: 'Tên Gõ Khác Hẳn',
      examDate: '2026-06-01',
      childId: first.body.childId,
    });
    expect(second.status).toBe(201);
    expect(second.body.childId).toBe(first.body.childId);
  });

  it('childId that does not exist → 400, not a 500/FK crash', async () => {
    const res = await agent.post('/api/patients').send({ ...validInput, childId: 'clnonexistentid00000000000' });
    expect(res.status).toBe(400);
  });
});

describe('GET/DELETE /api/patients/:id', () => {
  it('GET an existing id → 200; unknown id → 404', async () => {
    const created = await agent.post('/api/patients').send(validInput);
    const id = created.body.id;

    const found = await agent.get(`/api/patients/${id}`);
    expect(found.status).toBe(200);
    expect(found.body.id).toBe(id);

    const notFound = await agent.get('/api/patients/does-not-exist');
    expect(notFound.status).toBe(404);
  });

  it('DELETE removes the record; subsequent GET is 404', async () => {
    const created = await agent.post('/api/patients').send(validInput);
    const id = created.body.id;

    const del = await agent.delete(`/api/patients/${id}`);
    expect(del.status).toBe(204);

    const found = await agent.get(`/api/patients/${id}`);
    expect(found.status).toBe(404);
  });

  it('DELETE on an unknown id → 404', async () => {
    const del = await agent.delete('/api/patients/does-not-exist');
    expect(del.status).toBe(404);
  });
});

describe('GET /api/patients/export/csv', () => {
  it('returns correct content-type and a header row', async () => {
    await agent.post('/api/patients').send(validInput);

    const res = await agent.get('/api/patients/export/csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('STT');
    expect(res.text).toContain('Nguyễn Văn A');
  });

  it('escapes a name containing a comma and a double quote', async () => {
    await agent.post('/api/patients').send({ ...validInput, name: 'Trần "Bé" B, Jr.' });

    const res = await agent.get('/api/patients/export/csv');
    expect(res.text).toContain('"Trần ""Bé"" B, Jr."');
  });
});

describe('Auth enforcement', () => {
  it('unauthenticated request → 401', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  it('dieu_duong cannot DELETE a patient → 403', async () => {
    const created = await agent.post('/api/patients').send(validInput);
    const nurseAgent = await loginAsRole(app, 'dieu_duong');
    const res = await nurseAgent.delete(`/api/patients/${created.body.id}`);
    expect(res.status).toBe(403);
  });
});
