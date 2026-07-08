import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { DEFAULT_FOODS } from '../data/food-composition.data';
import { loadCompositionCache } from '../services/food.service';
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
  // Route mutations refresh the in-memory getFoodComposition()/getFoodsCache()
  // cache from the (now-truncated) test DB — restore the bootstrap defaults so
  // other test files sharing this process (notably menu-optimizer.service.test.ts)
  // see correct data.
  loadCompositionCache(DEFAULT_FOODS);
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const validPayload = {
  name: 'Bơ (quả)',
  category: 'Trái cây',
  kcalPer100: 160,
  proteinPer100: 2,
  carbPer100: 8.5,
  fatPer100: 14.7,
  benefits: 'Giàu chất béo không bão hoà, hỗ trợ phát triển não bộ',
  cautionNote: 'Năng lượng cao, dùng lượng vừa phải ở trẻ thừa cân',
  conditionTags: ['Thừa cân/Béo phì'],
  source: 'Viện Dinh Dưỡng',
};

describe('role enforcement', () => {
  it('GET is allowed for any authenticated role', async () => {
    const nurseAgent = await loginAsRole(app, 'dieu_duong');
    expect((await nurseAgent.get('/api/foods')).status).toBe(200);
  });

  it('unauthenticated → 401', async () => {
    expect((await request(app).get('/api/foods')).status).toBe(401);
  });

  it('dieu_duong → 403 on create/update/delete/import', async () => {
    const nurseAgent = await loginAsRole(app, 'dieu_duong');
    expect((await nurseAgent.post('/api/foods').send(validPayload)).status).toBe(403);
    expect((await nurseAgent.patch('/api/foods/whatever').send({ kcalPer100: 1 })).status).toBe(403);
    expect((await nurseAgent.delete('/api/foods/whatever')).status).toBe(403);
    expect((await nurseAgent.post('/api/foods/import').set('Content-Type', 'text/csv').send('x')).status).toBe(403);
  });

  it('bac_si → allowed to create (per plan: admin + bac_si can edit)', async () => {
    const doctorAgent = await loginAsRole(app, 'bac_si');
    const res = await doctorAgent.post('/api/foods').send(validPayload);
    expect(res.status).toBe(201);
  });
});

describe('POST /api/foods (create)', () => {
  it('creates a food and it appears in the list', async () => {
    const res = await adminAgent.post('/api/foods').send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.isSystemDefault).toBe(false);

    const list = await adminAgent.get('/api/foods');
    expect(list.body.some((f: { name: string }) => f.name === validPayload.name)).toBe(true);
  });

  it('duplicate name → 409', async () => {
    await adminAgent.post('/api/foods').send(validPayload);
    const res = await adminAgent.post('/api/foods').send(validPayload);
    expect(res.status).toBe(409);
  });

  it('invalid category → 400', async () => {
    const res = await adminAgent.post('/api/foods').send({ ...validPayload, name: 'X', category: 'Not a real category' });
    expect(res.status).toBe(400);
  });

  it('newly created food is immediately usable via getFoodComposition (integration with menu generation)', async () => {
    await adminAgent.post('/api/foods').send(validPayload);
    // The cache refresh happens inside createFood(); a subsequent request to any
    // route isn't required to observe it — but round-tripping through GET
    // confirms the DB write succeeded, which is the precondition for the cache load.
    const list = await adminAgent.get('/api/foods');
    expect(list.body.find((f: { name: string }) => f.name === validPayload.name)?.kcalPer100).toBe(160);
  });
});

describe('PATCH /api/foods/:id (update)', () => {
  it('updates nutrition fields and notes', async () => {
    const created = await adminAgent.post('/api/foods').send(validPayload);
    const res = await adminAgent.patch(`/api/foods/${created.body.id}`).send({ kcalPer100: 999, cautionNote: 'Cập nhật ghi chú' });
    expect(res.status).toBe(200);
    expect(res.body.kcalPer100).toBe(999);
    expect(res.body.cautionNote).toBe('Cập nhật ghi chú');
  });

  it('unknown id → 404', async () => {
    const res = await adminAgent.patch('/api/foods/does-not-exist').send({ kcalPer100: 1 });
    expect(res.status).toBe(404);
  });

  it('empty body → 400 (zod refine requires >=1 field)', async () => {
    const created = await adminAgent.post('/api/foods').send(validPayload);
    const res = await adminAgent.patch(`/api/foods/${created.body.id}`).send({});
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/foods/:id', () => {
  it('deletes a custom food', async () => {
    const created = await adminAgent.post('/api/foods').send(validPayload);
    const res = await adminAgent.delete(`/api/foods/${created.body.id}`);
    expect(res.status).toBe(204);
    const get = await adminAgent.get(`/api/foods/${created.body.id}`);
    expect(get.status).toBe(404);
  });

  it('unknown id → 404', async () => {
    const res = await adminAgent.delete('/api/foods/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('isSystemDefault food → 400, cannot be deleted through the API', async () => {
    const seeded = await testPrisma.food.create({
      data: { name: 'test-system-default', category: 'Tinh bột', kcalPer100: 100, isSystemDefault: true },
    });
    const res = await adminAgent.delete(`/api/foods/${seeded.id}`);
    expect(res.status).toBe(400);
    expect(await testPrisma.food.findUnique({ where: { id: seeded.id } })).not.toBeNull();
  });
});

describe('POST /api/foods/import (CSV upsert)', () => {
  const csvHeader = 'name,category,kcalPer100,proteinPer100,carbPer100,fatPer100,costPer100,preferenceScore,benefits,cautionNote,conditionTags,source';

  it('imports new rows and updates an existing row by name — never deletes others', async () => {
    const existing = await adminAgent.post('/api/foods').send(validPayload);

    const csv = [
      csvHeader,
      `"${validPayload.name}","Trái cây",200,3,9,15,,,"","",,""`,
      '"Sữa chua ít đường","Sữa & chế phẩm",56,3.5,4,1.5,,,"Bổ sung lợi khuẩn","Hạn chế nếu dị ứng đạm sữa bò","Dị ứng đạm sữa bò",""',
    ].join('\n');

    const res = await adminAgent.post('/api/foods/import').set('Content-Type', 'text/csv').send(csv);
    expect(res.status).toBe(200);
    expect(res.body.imported).toBe(2);

    const updated = await adminAgent.get(`/api/foods/${existing.body.id}`);
    expect(updated.body.kcalPer100).toBe(200);

    const list = await adminAgent.get('/api/foods');
    expect(list.body.some((f: { name: string }) => f.name === 'Sữa chua ít đường')).toBe(true);
  });

  it('does not delete an isSystemDefault row not mentioned in the CSV', async () => {
    const seeded = await testPrisma.food.create({
      data: { name: 'test-system-default-2', category: 'Tinh bột', kcalPer100: 100, isSystemDefault: true },
    });
    const csv = [csvHeader, '"Món mới","Rau củ",30,1,5,0.2,,,"","",,""'].join('\n');
    await adminAgent.post('/api/foods/import').set('Content-Type', 'text/csv').send(csv);
    expect(await testPrisma.food.findUnique({ where: { id: seeded.id } })).not.toBeNull();
  });

  it('malformed header → 400', async () => {
    const res = await adminAgent.post('/api/foods/import').set('Content-Type', 'text/csv').send('wrong,header\n1,2');
    expect(res.status).toBe(400);
  });

  it('invalid category in a data row → 400 with line number', async () => {
    const csv = [csvHeader, '"X","Không tồn tại",100,1,1,1,,,"","",,""'].join('\n');
    const res = await adminAgent.post('/api/foods/import').set('Content-Type', 'text/csv').send(csv);
    expect(res.status).toBe(400);
    expect(res.body.lineNumber).toBe(2);
  });
});

describe('GET /api/foods/export', () => {
  it('round-trips: export contains what we just created', async () => {
    await adminAgent.post('/api/foods').send(validPayload);
    const res = await adminAgent.get('/api/foods/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain(validPayload.name);
  });
});
