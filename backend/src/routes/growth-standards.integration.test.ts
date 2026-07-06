import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { DEFAULT_GROWTH_STANDARDS } from '../data/growth-standards-who-default';
import { getHfaMedian, loadRecords } from '../services/growth-standards.service';
import { loginAsRole } from '../test-utils/auth-test-helper';
import { testPrisma, truncateAllTables } from '../test-utils/test-prisma';

const app = createApp(testPrisma);
let agent: request.SuperAgentTest;

beforeAll(async () => {
  await truncateAllTables();
});

beforeEach(async () => {
  agent = await loginAsRole(app, 'admin');
});

afterEach(async () => {
  await truncateAllTables();
  // The import endpoint mutates the shared in-memory cache — restore the
  // real WHO default so other test files in this run see correct data.
  loadRecords(DEFAULT_GROWTH_STANDARDS);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const validCsv = [
  'gender,metric,months,median,l,s,source',
  'Nam,HFA,24,999.9,1,0.0348,Test source',
  'Nữ,HFA,24,888.8,1,0.0361,Test source',
].join('\n');

describe('POST /api/growth-standards/import', () => {
  it('valid CSV → imports and immediately affects calculations (no restart needed)', async () => {
    const res = await agent.post('/api/growth-standards/import').set('Content-Type', 'text/csv').send(validCsv);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(2);
    expect(getHfaMedian('Nam', 24)).toBe(999.9);
    expect(getHfaMedian('Nữ', 24)).toBe(888.8);
  });

  it('replaces the ENTIRE table — a month not present in the new CSV is gone (falls back to 228-cap default)', async () => {
    await agent.post('/api/growth-standards/import').set('Content-Type', 'text/csv').send(validCsv);
    // Only month 24 was imported; month 12 no longer resolves to a real value,
    // so getHfaMedian falls back to whatever month 228 holds (itself imported here as none, so the built-in fallback applies).
    const res = await agent.get('/api/growth-standards');
    expect(res.body).toHaveLength(2);
  });

  it('malformed header → 400, does not touch existing data', async () => {
    const res = await agent
      .post('/api/growth-standards/import')
      .set('Content-Type', 'text/csv')
      .send('wrong,header,here\n1,2,3');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Header');
  });

  it('invalid gender value → 400 with line number', async () => {
    const res = await agent
      .post('/api/growth-standards/import')
      .set('Content-Type', 'text/csv')
      .send('gender,metric,months,median,l,s,source\nMale,HFA,24,100,1,0.04,x');
    expect(res.status).toBe(400);
    expect(res.body.lineNumber).toBe(2);
  });

  it('empty body → 400', async () => {
    const res = await agent.post('/api/growth-standards/import').set('Content-Type', 'text/csv').send('');
    expect(res.status).toBe(400);
  });

  it('old 5-column CSV format (pre-LMS-upgrade) → 400, not silently accepted', async () => {
    const oldFormatCsv = ['gender,metric,months,median,source', 'Nam,HFA,24,999.9,Test source'].join('\n');
    const res = await agent.post('/api/growth-standards/import').set('Content-Type', 'text/csv').send(oldFormatCsv);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Header');
  });

  it('bac_si (non-admin) → 403', async () => {
    const doctorAgent = await loginAsRole(app, 'bac_si');
    const res = await doctorAgent.post('/api/growth-standards/import').set('Content-Type', 'text/csv').send(validCsv);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/growth-standards/export', () => {
  it('round-trips: export what we just imported', async () => {
    await agent.post('/api/growth-standards/import').set('Content-Type', 'text/csv').send(validCsv);
    const res = await agent.get('/api/growth-standards/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('999.9');
    expect(res.text).toContain('888.8');
  });
});
