import type { Prisma, PrismaClient } from '@prisma/client';
import type { GuardianInput, GuardianRecord, GuardianRelationship } from '@dinhduong/shared';

/** Accepts either a plain PrismaClient or a $transaction callback's tx client — both expose the same .guardian/.child methods these functions use. */
type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

export class GuardianServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

function toGuardianRecord(g: {
  id: string;
  relationship: string;
  name: string | null;
  dob: Date | null;
  address: string | null;
  email: string | null;
  phone: string | null;
}): GuardianRecord {
  return {
    id: g.id,
    relationship: g.relationship as GuardianRelationship,
    name: g.name,
    dob: g.dob ? g.dob.toISOString() : null,
    address: g.address,
    email: g.email,
    phone: g.phone,
  };
}

export async function getGuardiansForChild(prisma: PrismaOrTx, childId: string): Promise<GuardianRecord[]> {
  const guardians = await prisma.guardian.findMany({ where: { childId }, orderBy: { relationship: 'asc' } });
  return guardians.map(toGuardianRecord);
}

/** At least one guardian must have BOTH email and phone — the real business rule behind "bắt buộc có người đại diện". */
export function hasQualifyingGuardian(guardians: GuardianRecord[]): boolean {
  return guardians.some((g) => !!g.email && !!g.phone);
}

/**
 * Upserts one guardian (Bố or Mẹ) for a child, keyed by the unique
 * (childId, relationship) pair — calling this again for the same
 * relationship updates that same row rather than creating a second one.
 * If email or phone is being set, name must also be present (or already on
 * file) — a nameless contact isn't useful for "gửi kết quả cho cả bố và mẹ".
 */
export async function upsertGuardian(prisma: PrismaOrTx, childId: string, input: GuardianInput): Promise<GuardianRecord> {
  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) throw new GuardianServiceError('Không tìm thấy hồ sơ trẻ', 404);

  const existing = await prisma.guardian.findUnique({
    where: { childId_relationship: { childId, relationship: input.relationship } },
  });

  const nextName = input.name !== undefined ? input.name : (existing?.name ?? null);
  const nextEmail = input.email !== undefined ? input.email : (existing?.email ?? null);
  const nextPhone = input.phone !== undefined ? input.phone : (existing?.phone ?? null);
  if ((nextEmail || nextPhone) && !nextName?.trim()) {
    throw new GuardianServiceError('Cần nhập họ tên khi đã có email hoặc số điện thoại', 400);
  }

  const data = {
    name: input.name !== undefined ? (input.name?.trim() || null) : undefined,
    dob: input.dob !== undefined ? (input.dob ? new Date(input.dob) : null) : undefined,
    address: input.address !== undefined ? (input.address?.trim() || null) : undefined,
    email: input.email !== undefined ? (input.email?.trim() || null) : undefined,
    phone: input.phone !== undefined ? (input.phone?.trim() || null) : undefined,
  };

  const guardian = await prisma.guardian.upsert({
    where: { childId_relationship: { childId, relationship: input.relationship } },
    update: data,
    create: {
      childId,
      relationship: input.relationship,
      name: data.name ?? null,
      dob: data.dob ?? null,
      address: data.address ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
    },
  });

  return toGuardianRecord(guardian);
}

/**
 * Same as upsertGuardian, but rejects (rolling back, nothing is persisted) if
 * the child would end up with NO qualifying guardian afterward — e.g. a
 * doctor clearing the only guardian's email when no one else on file has
 * both email+phone. Used by PUT /api/children/:id/guardians (editing after
 * creation); the creation-time check lives separately in patient.service.ts's
 * ensureQualifyingGuardian, which has the freedom to require ADDING a new
 * qualifying guardian rather than only guarding against removing one.
 */
export async function upsertGuardianKeepingQualification(
  prisma: PrismaClient,
  childId: string,
  input: GuardianInput,
): Promise<GuardianRecord[]> {
  return prisma.$transaction(async (tx) => {
    await upsertGuardian(tx, childId, input);
    const guardians = await getGuardiansForChild(tx, childId);
    if (!hasQualifyingGuardian(guardians)) {
      throw new GuardianServiceError(
        'Không thể lưu — hồ sơ trẻ sẽ không còn người đại diện nào đủ điều kiện (có cả email và số điện thoại)',
        400,
      );
    }
    return guardians;
  });
}
