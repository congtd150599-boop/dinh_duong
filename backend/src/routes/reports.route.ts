import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { getClinicStatsReport } from '../services/clinic-stats.service';
import { asyncHandler } from '../utils/async-handler';

export function buildReportsRouter(prisma: PrismaClient): Router {
  const router = Router();

  // No requireRole — read-only, informational report; open to any authenticated
  // staff same as GET /api/patients.
  router.get(
    '/clinic-stats',
    asyncHandler(async (_req, res) => {
      res.json(await getClinicStatsReport(prisma));
    }),
  );

  return router;
}
