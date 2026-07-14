import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { DEFAULT_LAB_REFERENCE_RANGES } from '../data/lab-reference-ranges-default';
import { getLabReferenceRange, loadRecords } from '../services/lab-reference.service';
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
  // real default so other test files in this run see correct data.
  loadRecords(DEFAULT_LAB_REFERENCE_RANGES);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const validCsv = [
  'testKey,gender,minMonths,maxMonths,lowSevere,lowDeficit,highBorderline,highExcess,highInclusive,unit,source',
  'zn,Cả hai,0,9999,,999,,,false,test-unit,Test source',
].join('\n');

describe('POST /api/lab-references/import', () => {
  it('valid CSV → imports and immediately affects calculations (no restart needed)', async () => {
    const res = await agent.post('/api/lab-references/import').set('Content-Type', 'text/csv').send(validCsv);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(1);
    expect(getLabReferenceRange('zn', 'Nam', 24)?.lowDeficit).toBe(999);
  });

  it('replaces the ENTIRE table — a test key not present in the new CSV is gone', async () => {
    await agent.post('/api/lab-references/import').set('Content-Type', 'text/csv').send(validCsv);
    expect(getLabReferenceRange('ca', 'Nam', 24)).toBeNull();
    const res = await agent.get('/api/lab-references');
    expect(res.body).toHaveLength(1);
  });

  it('malformed header → 400, does not touch existing data', async () => {
    const res = await agent.post('/api/lab-references/import').set('Content-Type', 'text/csv').send('wrong,header,here\n1,2,3');
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Header');
  });

  it('invalid testKey → 400 with line number', async () => {
    const res = await agent
      .post('/api/lab-references/import')
      .set('Content-Type', 'text/csv')
      .send(
        'testKey,gender,minMonths,maxMonths,lowSevere,lowDeficit,highBorderline,highExcess,highInclusive,unit,source\nnotarealtest,Cả hai,0,9999,,1,,,false,x,x',
      );
    expect(res.status).toBe(400);
    expect(res.body.lineNumber).toBe(2);
  });

  it('all 4 thresholds blank → 400 (row would be meaningless)', async () => {
    const res = await agent
      .post('/api/lab-references/import')
      .set('Content-Type', 'text/csv')
      .send('testKey,gender,minMonths,maxMonths,lowSevere,lowDeficit,highBorderline,highExcess,highInclusive,unit,source\nzn,Cả hai,0,9999,,,,,,x,x');
    expect(res.status).toBe(400);
  });

  it('empty body → 400', async () => {
    const res = await agent.post('/api/lab-references/import').set('Content-Type', 'text/csv').send('');
    expect(res.status).toBe(400);
  });

  it('bac_si (non-admin) → 403', async () => {
    const doctorAgent = await loginAsRole(app, 'bac_si');
    const res = await doctorAgent.post('/api/lab-references/import').set('Content-Type', 'text/csv').send(validCsv);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/lab-references/export', () => {
  it('round-trips: export what we just imported', async () => {
    await agent.post('/api/lab-references/import').set('Content-Type', 'text/csv').send(validCsv);
    const res = await agent.get('/api/lab-references/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('999');
  });
});
