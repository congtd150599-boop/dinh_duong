import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { getChildHistory, searchChildren } from '../services/child.service';
import { asyncHandler } from '../utils/async-handler';

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

  return router;
}
