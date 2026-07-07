import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { GuardianServiceError, upsertGuardianKeepingQualification } from '../services/guardian.service';
import { getChildHistory, searchChildren } from '../services/child.service';
import { asyncHandler } from '../utils/async-handler';
import { guardianInputSchema } from '../validation/child.schema';

export function buildChildrenRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get(
    '/search',
    asyncHandler(async (req, res) => {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      res.json(await searchChildren(prisma, q));
    }),
  );

  router.get(
    '/:id/history',
    asyncHandler(async (req, res) => {
      const history = await getChildHistory(prisma, req.params.id);
      if (!history) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json(history);
    }),
  );

  // No requireRole — any authenticated staff (including điều dưỡng) can fix a
  // family's contact info, same as POST /api/patients being open to all roles.
  router.put(
    '/:id/guardians',
    asyncHandler(async (req, res) => {
      const parsed = guardianInputSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
      }
      try {
        const guardians = await upsertGuardianKeepingQualification(prisma, req.params.id, parsed.data);
        res.json(guardians);
      } catch (err) {
        if (err instanceof GuardianServiceError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
