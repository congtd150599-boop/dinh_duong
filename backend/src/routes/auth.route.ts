import type { PrismaClient } from '@prisma/client';
import { Router } from 'express';
import { AUTH_COOKIE_NAME, buildRequireAuth } from '../middleware/require-auth.middleware';
import { recordAudit } from '../services/audit-log.service';
import { signToken, verifyPassword } from '../services/auth.service';
import { registerUser, toRecord, UserServiceError } from '../services/user.service';
import { asyncHandler } from '../utils/async-handler';
import { loginSchema, registerSchema } from '../validation/auth.schema';

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
      if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
        res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });
        return;
      }
      // Checked only after verifying the password (not folded into the check
      // above) — once someone has proven they own these credentials, telling
      // them their account is pending/disabled is useful, not a security leak.
      if (user.status === 'pending') {
        res.status(401).json({ error: 'Tài khoản đang chờ quản trị viên phê duyệt' });
        return;
      }
      if (user.status !== 'active') {
        res.status(401).json({ error: 'Tài khoản đã bị vô hiệu hóa' });
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

  // Public — no requireAuth. Always creates a 'pending'/'dieu_duong' account
  // (see registerUser); never logs the caller in, since there's nothing to
  // authorize yet until an admin approves it.
  router.post(
    '/register',
    asyncHandler(async (req, res) => {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
        return;
      }
      try {
        const user = await registerUser(prisma, parsed.data);
        // No `req.user` on a public route — the newly-registered account is
        // its own actor here, same idea as an audit trail recording "who did
        // this", except the "who" only just came into existence.
        await recordAudit(prisma, {
          user: { id: user.id, name: user.name, email: user.email, role: user.role },
          action: 'user.register',
          targetType: 'User',
          targetId: user.id,
          summary: `Tài khoản "${user.name}" (${user.email}) tự đăng ký — đang chờ phê duyệt`,
        });
        res.status(201).json({ message: 'Đăng ký thành công. Vui lòng chờ quản trị viên phê duyệt tài khoản trước khi đăng nhập.' });
      } catch (err) {
        if (err instanceof UserServiceError) {
          res.status(err.status).json({ error: err.message });
          return;
        }
        throw err;
      }
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
