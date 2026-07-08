import type { PrismaClient } from '@prisma/client';
import express, { Router } from 'express';
import { requireRole } from '../middleware/require-auth.middleware';
import { recordAudit, summarizeFieldChanges } from '../services/audit-log.service';
import { exportFoodsCsv, FoodImportError, importFoods, parseFoodsCsv } from '../services/food-import.service';
import { createFood, deleteFood, FoodServiceError, getFood, listFoods, updateFood } from '../services/food.service';
import { asyncHandler } from '../utils/async-handler';
import { createFoodSchema, updateFoodSchema } from '../validation/food.schema';

const FOOD_FIELD_LABELS = {
  name: 'Tên',
  category: 'Nhóm',
  kcalPer100: 'Kcal/100g',
  proteinPer100: 'Đạm/100g',
  carbPer100: 'Bột đường/100g',
  fatPer100: 'Béo/100g',
  benefits: 'Công dụng',
  cautionNote: 'Lưu ý',
  conditionTags: 'Chống chỉ định',
  source: 'Nguồn',
};

function foodDiffFields(f: { name: string; category: string; kcalPer100: number; proteinPer100: number; carbPer100: number; fatPer100: number; benefits: string | null; cautionNote: string | null; conditionTags: string[]; source: string | null }) {
  return {
    name: f.name,
    category: f.category,
    kcalPer100: String(f.kcalPer100),
    proteinPer100: String(f.proteinPer100),
    carbPer100: String(f.carbPer100),
    fatPer100: String(f.fatPer100),
    benefits: f.benefits,
    cautionNote: f.cautionNote,
    conditionTags: f.conditionTags.length > 0 ? f.conditionTags.join(', ') : null,
    source: f.source,
  };
}

export function buildFoodsRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await listFoods(prisma));
    }),
  );

  // Must be registered before '/:id' so "export" isn't captured as an :id param.
  router.get(
    '/export',
    asyncHandler(async (_req, res) => {
      const csv = await exportFoodsCsv(prisma);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="danh-sach-thuc-pham.csv"');
      res.send(csv);
    }),
  );

  router.post(
    '/import',
    requireRole('admin', 'bac_si'),
    express.text({ type: '*/*', limit: '5mb' }),
    asyncHandler(async (req, res) => {
      if (typeof req.body !== 'string' || !req.body.trim()) {
        res.status(400).json({ error: 'Thiếu nội dung CSV trong body request' });
        return;
      }
      try {
        const records = parseFoodsCsv(req.body);
        const count = await importFoods(prisma, records);
        await recordAudit(prisma, {
          user: req.user!,
          action: 'food.import',
          targetType: 'Food',
          summary: `Nhập CSV thực phẩm: ${count} dòng`,
        });
        res.json({ imported: count });
      } catch (err) {
        if (err instanceof FoodImportError) {
          res.status(400).json({ error: err.message, lineNumber: err.lineNumber });
          return;
        }
        throw err;
      }
    }),
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const food = await getFood(prisma, req.params.id);
      if (!food) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json(food);
    }),
  );

  router.post(
    '/',
    requireRole('admin', 'bac_si'),
    asyncHandler(async (req, res) => {
      const parsed = createFoodSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
      }
      try {
        const food = await createFood(prisma, parsed.data);
        await recordAudit(prisma, {
          user: req.user!,
          action: 'food.create',
          targetType: 'Food',
          targetId: food.id,
          summary: `Thêm thực phẩm "${food.name}"`,
        });
        res.status(201).json(food);
      } catch (err) {
        if (err instanceof FoodServiceError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.patch(
    '/:id',
    requireRole('admin', 'bac_si'),
    asyncHandler(async (req, res) => {
      const parsed = updateFoodSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
      }
      try {
        const before = await getFood(prisma, req.params.id);
        const food = await updateFood(prisma, req.params.id, parsed.data);

        const diff = before
          ? summarizeFieldChanges(foodDiffFields(before), foodDiffFields(food), FOOD_FIELD_LABELS)
          : 'không có thay đổi';

        await recordAudit(prisma, {
          user: req.user!,
          action: 'food.update',
          targetType: 'Food',
          targetId: food.id,
          summary: `Cập nhật thực phẩm "${food.name}" — ${diff}`,
        });
        res.json(food);
      } catch (err) {
        if (err instanceof FoodServiceError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.delete(
    '/:id',
    requireRole('admin', 'bac_si'),
    asyncHandler(async (req, res) => {
      try {
        const deleted = await deleteFood(prisma, req.params.id);
        if (!deleted) {
          res.status(404).json({ error: 'Not found' });
          return;
        }
        await recordAudit(prisma, {
          user: req.user!,
          action: 'food.delete',
          targetType: 'Food',
          targetId: deleted.id,
          summary: `Xoá thực phẩm "${deleted.name}"`,
        });
        res.status(204).send();
      } catch (err) {
        if (err instanceof FoodServiceError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
