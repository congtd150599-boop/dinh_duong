import type { PrismaClient } from '@prisma/client';
import type { Role } from '@dinhduong/shared';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { verifyToken } from '../services/auth.service';

export const AUTH_COOKIE_NAME = 'dinhduong_session';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Verifies the JWT cookie, then re-fetches the user from Postgres (rather than
 * trusting the token's payload) so a role change or deactivation takes effect
 * on the user's very next request instead of waiting out the token's expiry.
 */
export function buildRequireAuth(prisma: PrismaClient): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) {
      res.status(401).json({ error: 'Chưa đăng nhập' });
      return;
    }

    let userId: string;
    try {
      userId = verifyToken(token).sub;
    } catch {
      res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(401).json({ error: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa' });
      return;
    }
    if (user.status === 'pending') {
      res.status(401).json({ error: 'Tài khoản đang chờ quản trị viên phê duyệt' });
      return;
    }
    if (user.status !== 'active') {
      res.status(401).json({ error: 'Tài khoản không tồn tại hoặc đã bị vô hiệu hóa' });
      return;
    }

    req.user = { id: user.id, name: user.name, email: user.email, role: user.role as Role };
    next();
  };
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Chưa đăng nhập' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Không có quyền truy cập chức năng này' });
      return;
    }
    next();
  };
}
