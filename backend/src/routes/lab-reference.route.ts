import type { PrismaClient } from '@prisma/client';
import express, { Router } from 'express';
import { requireRole } from '../middleware/require-auth.middleware';
import { recordAudit } from '../services/audit-log.service';
import {
  exportLabReferenceRangesCsv,
  importLabReferenceRanges,
  LabReferenceImportError,
  parseLabReferenceCsv,
} from '../services/lab-reference-import.service';
import { getAllLabReferenceRanges } from '../services/lab-reference.service';
import { asyncHandler } from '../utils/async-handler';

export function buildLabReferenceRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(getAllLabReferenceRanges());
  });

  router.get('/export', (_req, res) => {
    const csv = exportLabReferenceRangesCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="lab-reference-ranges.csv"');
    res.send(csv);
  });

  // Raw CSV body, not JSON — same convention as growth-standards.route.ts.
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
        const records = parseLabReferenceCsv(req.body);
        const count = await importLabReferenceRanges(prisma, records);
        await recordAudit(prisma, {
          user: req.user!,
          action: 'lab_reference.import',
          targetType: 'LabReferenceRange',
          summary: `Nhập CSV chuẩn xét nghiệm: ${count} dòng (thay thế toàn bộ dữ liệu cũ)`,
        });
        res.json({ imported: count });
      } catch (err) {
        if (err instanceof LabReferenceImportError) {
          res.status(400).json({ error: err.message, lineNumber: err.lineNumber });
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
