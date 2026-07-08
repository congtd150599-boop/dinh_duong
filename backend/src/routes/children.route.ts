import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { recordAudit, summarizeFieldChanges } from '../services/audit-log.service';
import { GuardianServiceError, upsertGuardianKeepingQualification } from '../services/guardian.service';
import { getChildHistory, searchChildren } from '../services/child.service';
import { asyncHandler } from '../utils/async-handler';
import { guardianInputSchema } from '../validation/child.schema';

const GUARDIAN_FIELD_LABELS = { name: 'Họ tên', dob: 'Ngày sinh', address: 'Địa chỉ', email: 'Email', phone: 'SĐT' };

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
        const before = await prisma.guardian.findUnique({
          where: { childId_relationship: { childId: req.params.id, relationship: parsed.data.relationship } },
        });
        const guardians = await upsertGuardianKeepingQualification(prisma, req.params.id, parsed.data);
        const after = guardians.find((g) => g.relationship === parsed.data.relationship);
        const child = await prisma.child.findUnique({ where: { id: req.params.id }, select: { name: true } });

        const diff = summarizeFieldChanges(
          {
            name: before?.name ?? null,
            dob: before?.dob ? before.dob.toISOString().slice(0, 10) : null,
            address: before?.address ?? null,
            email: before?.email ?? null,
            phone: before?.phone ?? null,
          },
          {
            name: after?.name ?? null,
            dob: after?.dob ? after.dob.slice(0, 10) : null,
            address: after?.address ?? null,
            email: after?.email ?? null,
            phone: after?.phone ?? null,
          },
          GUARDIAN_FIELD_LABELS,
        );

        await recordAudit(prisma, {
          user: req.user!,
          action: 'guardian.update',
          targetType: 'Guardian',
          targetId: req.params.id,
          summary: `Cập nhật thông tin ${parsed.data.relationship} cho trẻ "${child?.name ?? req.params.id}" — ${diff}`,
        });
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
