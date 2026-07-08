import type { PrismaClient } from '@prisma/client';
import type { AssessmentInput, AssessmentResult } from '@dinhduong/shared';
import { runAssessment } from './assessment.service';
import { findOrCreateChild } from './child.service';
import { getGuardiansForChild, hasQualifyingGuardian, upsertGuardian } from './guardian.service';

export class PatientServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

function labSummary(labs: AssessmentResult['labs']): string {
  const abnormal = labs.filter((l) => l.status !== 'ok').map((l) => l.diagnosis);
  return abnormal.length > 0 ? abnormal.join(', ') : 'Bình thường';
}

/**
 * Resolves the visit's childId: an explicit selection from InputTab's search
 * box takes precedence (validated to actually exist) so a doctor picking an
 * existing record always wins even if they retyped the name slightly
 * differently; otherwise falls back to findOrCreateChild's name+dob match.
 */
async function resolveChildId(prisma: PrismaClient, input: AssessmentInput): Promise<string> {
  if (input.childId) {
    const child = await prisma.child.findUnique({ where: { id: input.childId } });
    if (!child) throw new PatientServiceError('childId không tồn tại', 400);
    return child.id;
  }
  const child = await findOrCreateChild(prisma, { name: input.name, dob: input.dob, gender: input.gender });
  return child.id;
}

/**
 * Applies InputTab's quick "representative guardian" entry if provided, then
 * enforces the real rule: the child must end up with at least one guardian
 * (Bố or Mẹ) who has both email and phone. This naturally covers both cases —
 * a brand-new child relies entirely on this visit's input, while an existing
 * child that already qualifies doesn't need representativeGuardian resent.
 */
async function ensureQualifyingGuardian(prisma: PrismaClient, childId: string, input: AssessmentInput): Promise<void> {
  if (input.representativeGuardian) {
    await upsertGuardian(prisma, childId, input.representativeGuardian);
  }
  const guardians = await getGuardiansForChild(prisma, childId);
  if (!hasQualifyingGuardian(guardians)) {
    throw new PatientServiceError('Cần có ít nhất 1 người đại diện (Bố hoặc Mẹ) với đầy đủ họ tên, email và số điện thoại', 400);
  }
}

export async function createPatient(prisma: PrismaClient, input: AssessmentInput) {
  const result = runAssessment(input);
  const childId = await resolveChildId(prisma, input);
  await ensureQualifyingGuardian(prisma, childId, input);

  return prisma.patient.create({
    data: {
      childId,
      name: result.name,
      dob: new Date(result.dob),
      examDate: new Date(result.examDate),
      gender: result.gender,
      weight: result.weight,
      height: result.height,
      muac: result.muac,
      revisit: result.revisit ? new Date(result.revisit) : null,
      tuvan: result.tuvan,
      labCa: input.labs.ca ?? null,
      labVitD: input.labs.vitD ?? null,
      labZn: input.labs.zn ?? null,
      labHb: input.labs.hb ?? null,
      labFe: input.labs.fe ?? null,
      labFerritin: input.labs.ferritin ?? null,
      labChol: input.labs.chol ?? null,
      labTg: input.labs.tg ?? null,
      months: result.months,
      bmi: result.bmi,
      wfa: result.wfa,
      hfa: result.hfa,
      wfh: result.wfh,
      muacStatus: result.muacStatus,
      stdEnergy: result.stdEnergy,
      targetEnergy: result.targetEnergy,
      carbG: result.carbG,
      proteinG: result.proteinG,
      lipidG: result.lipidG,
      labAssessmentSummary: labSummary(result.labs),
      fullResult: result as object,
    },
  });
}

export async function listPatients(prisma: PrismaClient) {
  const patients = await prisma.patient.findMany({ orderBy: { createdAt: 'asc' }, include: { child: { include: { guardians: true } } } });
  // "stt" (display order number) is computed here, not stored — see plan notes on
  // why the legacy sequential-number bug (never renumbered after delete) isn't ported.
  // hasQualifyingGuardian is read-only here, denormalized from the joined
  // Child's Guardian rows purely so LogTab can show a "Liên hệ" column
  // without an extra round-trip per row — Guardian stays the source of truth.
  return patients.map(({ child, ...p }, index) => ({
    ...p,
    stt: index + 1,
    hasQualifyingGuardian: child.guardians.some((g) => !!g.email && !!g.phone),
  }));
}

export async function getPatient(prisma: PrismaClient, id: string) {
  const patient = await prisma.patient.findUnique({ where: { id }, include: { child: { include: { guardians: true } } } });
  if (!patient) return null;
  const { child, ...p } = patient;
  return { ...p, hasQualifyingGuardian: child.guardians.some((g) => !!g.email && !!g.phone) };
}

/** Returns the deleted row (for the caller to build an audit-log summary from) or null if no such patient existed. */
export async function deletePatient(prisma: PrismaClient, id: string) {
  try {
    return await prisma.patient.delete({ where: { id } });
  } catch {
    return null;
  }
}

function csvEscape(value: unknown): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** Server-side port of legacy exportCSV() (lines 2829-2844), same headers/column order. */
export async function exportPatientsCsv(prisma: PrismaClient): Promise<string> {
  const patients = await listPatients(prisma);
  const headers = [
    'STT',
    'Ngày khám',
    'Họ tên',
    'DOB',
    'Tuổi(T)',
    'Giới',
    'CN(kg)',
    'CC(cm)',
    'BMI',
    'CN/Tuổi',
    'CC/Tuổi',
    'CN/CC',
    'NL chuẩn',
    'NL cá nhân',
    'Đánh giá vi chất',
    'Ngày TK',
    'Tư vấn',
  ];
  const rows = patients.map((p) => [
    p.stt,
    p.examDate.toISOString().slice(0, 10),
    p.name,
    p.dob.toISOString().slice(0, 10),
    p.months,
    p.gender,
    p.weight,
    p.height,
    p.bmi,
    p.wfa,
    p.hfa,
    p.wfh,
    p.stdEnergy,
    p.targetEnergy,
    p.labAssessmentSummary,
    p.revisit ? p.revisit.toISOString().slice(0, 10) : '',
    p.tuvan,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  return '﻿' + csv; // BOM prefix so Excel renders Vietnamese diacritics correctly
}
