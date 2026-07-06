import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { testPrisma, truncateAllTables } from '../test-utils/test-prisma';

const app = createApp(testPrisma);

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

afterEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

describe('POST /api/assessments', () => {
  it('valid payload → 200 with expected fields, does not persist', async () => {
    const res = await request(app).post('/api/assessments').send(validInput);
    expect(res.status).toBe(200);
    expect(res.body.wfa).toBe('Bình thường');
    expect(res.body.targetEnergy).toBe(1200);

    const list = await request(app).get('/api/patients');
    expect(list.body).toHaveLength(0);
  });

  it('missing required field (name) → 400', async () => {
    const { name, ...rest } = validInput;
    const res = await request(app).post('/api/assessments').send(rest);
    expect(res.status).toBe(400);
  });

  it('malformed type (weight as string) → 400, not 500', async () => {
    const res = await request(app).post('/api/assessments').send({ ...validInput, weight: '12.2' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/patients + GET /api/patients', () => {
  it('creates a patient (201) and it appears in the subsequent list', async () => {
    const createRes = await request(app).post('/api/patients').send(validInput);
    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.wfa).toBe('Bình thường');

    const listRes = await request(app).get('/api/patients');
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].name).toBe('Nguyễn Văn A');
    expect(listRes.body[0].stt).toBe(1);
  });

  it('rejects invalid payload with 400 and does not create a row', async () => {
    const res = await request(app).post('/api/patients').send({ ...validInput, weight: -5 });
    expect(res.status).toBe(400);
    const listRes = await request(app).get('/api/patients');
    expect(listRes.body).toHaveLength(0);
  });
});

describe('GET/DELETE /api/patients/:id', () => {
  it('GET an existing id → 200; unknown id → 404', async () => {
    const created = await request(app).post('/api/patients').send(validInput);
    const id = created.body.id;

    const found = await request(app).get(`/api/patients/${id}`);
    expect(found.status).toBe(200);
    expect(found.body.id).toBe(id);

    const notFound = await request(app).get('/api/patients/does-not-exist');
    expect(notFound.status).toBe(404);
  });

  it('DELETE removes the record; subsequent GET is 404', async () => {
    const created = await request(app).post('/api/patients').send(validInput);
    const id = created.body.id;

    const del = await request(app).delete(`/api/patients/${id}`);
    expect(del.status).toBe(204);

    const found = await request(app).get(`/api/patients/${id}`);
    expect(found.status).toBe(404);
  });

  it('DELETE on an unknown id → 404', async () => {
    const del = await request(app).delete('/api/patients/does-not-exist');
    expect(del.status).toBe(404);
  });
});

describe('GET /api/patients/export/csv', () => {
  it('returns correct content-type and a header row', async () => {
    await request(app).post('/api/patients').send(validInput);

    const res = await request(app).get('/api/patients/export/csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('STT');
    expect(res.text).toContain('Nguyễn Văn A');
  });

  it('escapes a name containing a comma and a double quote', async () => {
    await request(app)
      .post('/api/patients')
      .send({ ...validInput, name: 'Trần "Bé" B, Jr.' });

    const res = await request(app).get('/api/patients/export/csv');
    expect(res.text).toContain('"Trần ""Bé"" B, Jr."');
  });
});
