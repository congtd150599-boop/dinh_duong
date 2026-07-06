import type { PrismaClient } from '@prisma/client';
import type { AssessmentInput, AssessmentResult } from '@dinhduong/shared';
import { runAssessment } from './assessment.service';

function labSummary(labs: AssessmentResult['labs']): string {
  const abnormal = labs.filter((l) => l.status !== 'ok').map((l) => l.diagnosis);
  return abnormal.length > 0 ? abnormal.join(', ') : 'Bình thường';
}

export async function createPatient(prisma: PrismaClient, input: AssessmentInput) {
  const result = runAssessment(input);

  return prisma.patient.create({
    data: {
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
  const patients = await prisma.patient.findMany({ orderBy: { createdAt: 'asc' } });
  // "stt" (display order number) is computed here, not stored — see plan notes on
  // why the legacy sequential-number bug (never renumbered after delete) isn't ported.
  return patients.map((p, index) => ({ ...p, stt: index + 1 }));
}

export async function getPatient(prisma: PrismaClient, id: string) {
  return prisma.patient.findUnique({ where: { id } });
}

export async function deletePatient(prisma: PrismaClient, id: string): Promise<boolean> {
  try {
    await prisma.patient.delete({ where: { id } });
    return true;
  } catch {
    return false;
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
