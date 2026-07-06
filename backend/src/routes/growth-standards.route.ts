import type { PrismaClient } from '@prisma/client';
import express, { Router } from 'express';
import { requireRole } from '../middleware/require-auth.middleware';
import {
  exportGrowthStandardsCsv,
  GrowthStandardsImportError,
  importGrowthStandards,
  parseGrowthStandardsCsv,
} from '../services/growth-standards-import.service';
import { getAllRecords } from '../services/growth-standards.service';
import { asyncHandler } from '../utils/async-handler';

export function buildGrowthStandardsRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(getAllRecords());
  });

  router.get('/export', (_req, res) => {
    const csv = exportGrowthStandardsCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="growth-standards.csv"');
    res.send(csv);
  });

  // Raw CSV body, not JSON — only this route needs text parsing.
  router.post(
    '/import',
    requireRole('admin'),
    express.text({ type: '*/*', limit: '2mb' }),
    asyncHandler(async (req, res) => {
      if (typeof req.body !== 'string' || !req.body.trim()) {
        res.status(400).json({ error: 'Thiếu nội dung CSV trong body request' });
        return;
      }
      try {
        const records = parseGrowthStandardsCsv(req.body);
        const count = await importGrowthStandards(prisma, records);
        res.json({ imported: count });
      } catch (err) {
        if (err instanceof GrowthStandardsImportError) {
          res.status(400).json({ error: err.message, lineNumber: err.lineNumber });
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
