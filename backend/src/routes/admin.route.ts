import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { listAuditLogs } from '../services/audit-log.service';
import { BackupError, listBackups, runDatabaseBackup } from '../services/backup.service';
import { asyncHandler } from '../utils/async-handler';

/** Admin-only surface for the two "operations" features that don't fit the clinical routes: on-demand/scheduled DB backups and the audit trail viewer. Mounted with requireRole('admin') in app.ts, same as /api/users. */
export function buildAdminRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get(
    '/backups',
    asyncHandler(async (_req, res) => {
      res.json(await listBackups());
    }),
  );

  router.post(
    '/backups',
    asyncHandler(async (_req, res) => {
      try {
        const backup = await runDatabaseBackup();
        res.status(201).json(backup);
      } catch (err) {
        if (err instanceof BackupError) {
          res.status(500).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.get(
    '/audit-log',
    asyncHandler(async (_req, res) => {
      res.json(await listAuditLogs(prisma));
    }),
  );

  return router;
}
