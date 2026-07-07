import type { PrismaClient } from '@prisma/client';
import express, { Router } from 'express';
import { requireRole } from '../middleware/require-auth.middleware';
import { exportFoodsCsv, FoodImportError, importFoods, parseFoodsCsv } from '../services/food-import.service';
import { createFood, deleteFood, FoodServiceError, getFood, listFoods, updateFood } from '../services/food.service';
import { asyncHandler } from '../utils/async-handler';
import { createFoodSchema, updateFoodSchema } from '../validation/food.schema';

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
        const food = await updateFood(prisma, req.params.id, parsed.data);
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
