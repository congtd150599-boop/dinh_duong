import type { PrismaClient } from '@prisma/client';
import type { Role } from '@dinhduong/shared';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set — refusing to start with an insecure default. Set it in .env.');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h';

export interface TokenPayload {
  sub: string;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(userId: string): string {
  const options: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId } satisfies TokenPayload, JWT_SECRET as string, options);
}

/** Throws (jsonwebtoken's JsonWebTokenError/TokenExpiredError) on an invalid or expired token. */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET as string) as unknown as TokenPayload;
}

/**
 * Creates the first admin account from env vars when the User table is empty —
 * mirrors the existing "seed WHO default growth data when DB is empty" pattern
 * in growth-standards.service.ts. Safe to call on every server start.
 */
export async function bootstrapAdminIfNeeded(prisma: PrismaClient): Promise<void> {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    console.log(`Found ${existingCount} existing user(s) — skipping admin bootstrap.`);
    return;
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Quản trị viên';

  if (!email || !password) {
    console.warn(
      'No users exist yet, and ADMIN_EMAIL/ADMIN_PASSWORD are not set — no admin account was created. Set them in .env and restart to bootstrap the first admin.',
    );
    return;
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { name, email, passwordHash, role: 'admin' satisfies Role, status: 'active' },
  });
  console.log(`Bootstrapped first admin account: ${email}`);
}
