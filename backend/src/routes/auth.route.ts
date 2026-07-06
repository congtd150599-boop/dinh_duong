import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { AUTH_COOKIE_NAME, buildRequireAuth } from '../middleware/require-auth.middleware';
import { signToken, verifyPassword } from '../services/auth.service';
import { toRecord } from '../services/user.service';
import { asyncHandler } from '../utils/async-handler';
import { loginSchema } from '../validation/auth.schema';

export function buildAuthRouter(prisma: PrismaClient): Router {
  const router = Router();
  const requireAuth = buildRequireAuth(prisma);

  router.post(
    '/login',
    asyncHandler(async (req, res) => {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
      }

      const email = parsed.data.email.trim().toLowerCase();
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.isActive || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
        res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        return;
      }

      const token = signToken(user.id);
      res.cookie(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.COOKIE_SECURE === 'true',
        path: '/',
      });
      res.json({ user: toRecord(user) });
    }),
  );

  router.post('/logout', (_req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    res.status(204).send();
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
