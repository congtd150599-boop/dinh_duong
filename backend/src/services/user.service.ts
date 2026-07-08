import type { PrismaClient, User } from '@prisma/client';
import type { Role, UserRecord, UserStatus } from '@dinhduong/shared';
import { hashPassword } from './auth.service';

export class UserServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

export function toRecord(user: User): UserRecord {
  return {
    id: user.id,
    createdAt: user.createdAt.toISOString(),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    status: user.status as UserStatus,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function listUsers(prisma: PrismaClient): Promise<UserRecord[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  return users.map(toRecord);
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export async function createUser(prisma: PrismaClient, input: CreateUserInput): Promise<UserRecord> {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new UserServiceError('Email này đã được sử dụng', 409);

  const passwordHash = await hashPassword(input.password);
  // status: 'active' — an admin creating this account directly already vouches
  // for it, unlike self-registration (see registerUser) which always lands 'pending'.
  const user = await prisma.user.create({
    data: { name: input.name.trim(), email, passwordHash, role: input.role, status: 'active' },
  });
  return toRecord(user);
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Self-service registration (POST /api/auth/register, no auth required).
 * Always lands as role='dieu_duong' (lowest privilege, never admin) and
 * status='pending' — the account cannot log in (see requireAuth) until an
 * admin reviews it via updateUser and flips status to 'active', optionally
 * upgrading the role first. This is the intentionally narrow, safe surface
 * for the "registration" feature: it lets staff pick their own password
 * instead of an admin setting one for them, without letting anyone grant
 * themselves system access to children's health data unsupervised.
 */
export async function registerUser(prisma: PrismaClient, input: RegisterInput): Promise<UserRecord> {
  const email = normalizeEmail(input.email);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new UserServiceError('Email này đã được sử dụng', 409);

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: { name: input.name.trim(), email, passwordHash, role: 'dieu_duong' satisfies Role, status: 'pending' },
  });
  return toRecord(user);
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  status?: UserStatus;
}

async function countActiveAdmins(prisma: PrismaClient, excludingId: string): Promise<number> {
  return prisma.user.count({ where: { role: 'admin', status: 'active', id: { not: excludingId } } });
}

export async function updateUser(prisma: PrismaClient, targetId: string, actorId: string, input: UpdateUserInput): Promise<UserRecord> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new UserServiceError('Không tìm thấy người dùng', 404);

  const wasActive = target.status === 'active';
  const willDeactivate = input.status !== undefined && input.status !== 'active' && wasActive;
  const willDemote = input.role !== undefined && input.role !== 'admin' && target.role === 'admin';

  if (targetId === actorId && (willDeactivate || willDemote)) {
    throw new UserServiceError('Không thể tự vô hiệu hóa hoặc hạ quyền chính tài khoản đang đăng nhập — nhờ admin khác thực hiện', 400);
  }

  if ((willDeactivate || willDemote) && target.role === 'admin') {
    const remaining = await countActiveAdmins(prisma, targetId);
    if (remaining === 0) {
      throw new UserServiceError('Không thể vô hiệu hóa hoặc hạ quyền admin cuối cùng còn lại trong hệ thống', 400);
    }
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
  return toRecord(user);
}

/** Returns the target user (for the caller to build an audit-log summary from). */
export async function resetPassword(prisma: PrismaClient, targetId: string, newPassword: string): Promise<UserRecord> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new UserServiceError('Không tìm thấy người dùng', 404);
  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({ where: { id: targetId }, data: { passwordHash } });
  return toRecord(updated);
}
