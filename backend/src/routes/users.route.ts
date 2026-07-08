import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { recordAudit, summarizeFieldChanges } from '../services/audit-log.service';
import { createUser, listUsers, resetPassword, updateUser, UserServiceError } from '../services/user.service';
import { asyncHandler } from '../utils/async-handler';
import { createUserSchema, resetPasswordSchema, updateUserSchema } from '../validation/user.schema';

const USER_FIELD_LABELS = { name: 'Họ tên', role: 'Vai trò', isActive: 'Trạng thái' };
const ACTIVE_LABEL = { true: 'Đang hoạt động', false: 'Đã vô hiệu hóa' } as const;

export function buildUsersRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.json(await listUsers(prisma));
    }),
  );

  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
      }
      try {
        const user = await createUser(prisma, parsed.data);
        await recordAudit(prisma, {
          user: req.user!,
          action: 'user.create',
          targetType: 'User',
          targetId: user.id,
          summary: `Tạo tài khoản "${user.name}" (${user.email}, vai trò: ${user.role})`,
        });
        res.status(201).json(user);
      } catch (err) {
        if (err instanceof UserServiceError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
      }
      try {
        const before = await prisma.user.findUnique({ where: { id: req.params.id } });
        const user = await updateUser(prisma, req.params.id, req.user!.id, parsed.data);

        const diff = summarizeFieldChanges(
          {
            name: before?.name ?? null,
            role: before?.role ?? null,
            isActive: before ? ACTIVE_LABEL[String(before.isActive) as 'true' | 'false'] : null,
          },
          {
            name: user.name,
            role: user.role,
            isActive: ACTIVE_LABEL[String(user.isActive) as 'true' | 'false'],
          },
          USER_FIELD_LABELS,
        );

        await recordAudit(prisma, {
          user: req.user!,
          action: 'user.update',
          targetType: 'User',
          targetId: user.id,
          summary: `Cập nhật tài khoản "${user.name}" — ${diff}`,
        });
        res.json(user);
      } catch (err) {
        if (err instanceof UserServiceError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.post(
    '/:id/reset-password',
    asyncHandler(async (req, res) => {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
      }
      try {
        const user = await resetPassword(prisma, req.params.id, parsed.data.newPassword);
        await recordAudit(prisma, {
          user: req.user!,
          action: 'user.reset_password',
          targetType: 'User',
          targetId: user.id,
          summary: `Đặt lại mật khẩu cho tài khoản "${user.name}" (${user.email})`,
        });
        res.status(204).send();
      } catch (err) {
        if (err instanceof UserServiceError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
