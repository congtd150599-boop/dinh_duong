import type { PrismaClient } from '@prisma/client';
import type { AuditLogRecord } from '@dinhduong/shared';
import type { AuthenticatedUser } from '../middleware/require-auth.middleware';

export interface RecordAuditInput {
  user: AuthenticatedUser;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
}

/**
 * Best-effort audit write — called from route handlers right after a
 * mutation succeeds (see e.g. patients.route.ts). Never throws: a logging
 * failure must not turn an otherwise-successful request into an error for
 * the user, so any DB error here is swallowed (and logged to console) rather
 * than propagated.
 */
export async function recordAudit(prisma: PrismaClient, input: RecordAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.user.id,
        userName: input.user.name,
        userEmail: input.user.email,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        summary: input.summary,
      },
    });
  } catch (err) {
    console.error('[audit-log] Ghi nhật ký thao tác thất bại:', err);
  }
}

const EMPTY_PLACEHOLDER = '(trống)';

/**
 * Builds a "Field: old → new" summary fragment for the fields that actually
 * changed between two snapshots of the same record — used by every
 * *.update route so audit entries show the real before/after values instead
 * of a generic "đã cập nhật X" line. Callers pre-normalize each field to a
 * display string (date → 'YYYY-MM-DD', boolean → a Vietnamese label, array →
 * joined string, etc.) since the right normalization is field-specific.
 */
export function summarizeFieldChanges(
  before: Record<string, string | null>,
  after: Record<string, string | null>,
  labels: Record<string, string>,
): string {
  const changes: string[] = [];
  for (const key of Object.keys(labels)) {
    const oldVal = before[key] ?? EMPTY_PLACEHOLDER;
    const newVal = after[key] ?? EMPTY_PLACEHOLDER;
    if (oldVal === newVal) continue;
    changes.push(`${labels[key]}: "${oldVal}" → "${newVal}"`);
  }
  return changes.length > 0 ? changes.join('; ') : 'không có thay đổi';
}

function toAuditLogRecord(r: {
  id: string;
  createdAt: Date;
  userId: string | null;
  userName: string;
  userEmail: string;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
}): AuditLogRecord {
  return {
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    summary: r.summary,
  };
}

const LIST_LIMIT = 200;

/** Most recent entries first, capped at 200 — a simple bounded list rather than full pagination, matching this app's scale (single clinic). */
export async function listAuditLogs(prisma: PrismaClient): Promise<AuditLogRecord[]> {
  const rows = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: LIST_LIMIT });
  return rows.map(toAuditLogRecord);
}
