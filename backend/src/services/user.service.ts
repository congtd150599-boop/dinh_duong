import type { PrismaClient, User } from '@prisma/client';
import type { Role, UserRecord } from '@dinhduong/shared';
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
    isActive: user.isActive,
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
  const user = await prisma.user.create({
    data: { name: input.name.trim(), email, passwordHash, role: input.role, isActive: true },
  });
  return toRecord(user);
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

async function countActiveAdmins(prisma: PrismaClient, excludingId: string): Promise<number> {
  return prisma.user.count({ where: { role: 'admin', isActive: true, id: { not: excludingId } } });
}

export async function updateUser(prisma: PrismaClient, targetId: string, actorId: string, input: UpdateUserInput): Promise<UserRecord> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new UserServiceError('Không tìm thấy người dùng', 404);

  const willDeactivate = input.isActive === false && target.isActive;
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
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  return toRecord(user);
}

export async function resetPassword(prisma: PrismaClient, targetId: string, newPassword: string): Promise<void> {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new UserServiceError('Không tìm thấy người dùng', 404);
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: targetId }, data: { passwordHash } });
}
