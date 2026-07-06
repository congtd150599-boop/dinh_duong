import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { createUser, listUsers, resetPassword, updateUser, UserServiceError } from '../services/user.service';
import { asyncHandler } from '../utils/async-handler';
import { createUserSchema, resetPasswordSchema, updateUserSchema } from '../validation/user.schema';

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
        const user = await updateUser(prisma, req.params.id, req.user!.id, parsed.data);
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
        await resetPassword(prisma, req.params.id, parsed.data.newPassword);
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
