import type { PrismaClient } from '@prisma/client';
import type { LabTestKey } from '@dinhduong/shared';
import { getAllLabReferenceRanges, loadFromDatabase, type LabReferenceRange } from './lab-reference.service';

export class LabReferenceImportError extends Error {
  constructor(
    message: string,
    public lineNumber?: number,
  ) {
    super(message);
  }
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

const VALID_TEST_KEYS: LabTestKey[] = ['ca', 'vitD', 'zn', 'hb', 'fe', 'ferritin', 'chol', 'tg'];
const VALID_GENDERS = ['Nam', 'Nữ', 'Cả hai'];

function parseNullableFloat(raw: string, fieldName: string, lineNumber: number): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    throw new LabReferenceImportError(`Dòng ${lineNumber}: ${fieldName} phải để trống hoặc là số, nhận được "${raw}"`, lineNumber);
  }
  return n;
}

/**
 * Parses a CSV with header
 * `testKey,gender,minMonths,maxMonths,lowSevere,lowDeficit,highBorderline,highExcess,highInclusive,unit,source`.
 * The 4 threshold columns are individually optional (blank = not applicable
 * to that test's shape — e.g. Kẽm only sets lowDeficit) — see
 * lab-reference.service.ts's LabReferenceRange doc comment for which fields a
 * one-sided/two-sided/two-tier test uses. Throws LabReferenceImportError with
 * a 1-based line number on the first malformed row — callers should reject
 * the whole import rather than partially apply it.
 */
export function parseLabReferenceCsv(csvText: string): LabReferenceRange[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) throw new LabReferenceImportError('CSV rỗng hoặc thiếu dữ liệu (chỉ có header)');

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const expected = ['testkey', 'gender', 'minmonths', 'maxmonths', 'lowsevere', 'lowdeficit', 'highborderline', 'highexcess', 'highinclusive', 'unit', 'source'];
  if (expected.some((col, i) => header[i] !== col)) {
    throw new LabReferenceImportError(`Header phải đúng thứ tự: ${expected.join(',')} (nhận được: ${header.join(',')})`, 1);
  }

  const records: LabReferenceRange[] = [];
  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    if (!lines[i].trim()) continue;
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 11) {
      throw new LabReferenceImportError(`Dòng ${lineNumber}: thiếu cột (cần đủ 11 cột, có ${cols.length})`, lineNumber);
    }
    const [testKeyRaw, genderRaw, minMonthsRaw, maxMonthsRaw, lowSevereRaw, lowDeficitRaw, highBorderlineRaw, highExcessRaw, highInclusiveRaw, unitRaw, sourceRaw] = cols;

    const testKey = testKeyRaw.trim();
    if (!VALID_TEST_KEYS.includes(testKey as LabTestKey)) {
      throw new LabReferenceImportError(`Dòng ${lineNumber}: testKey phải là một trong ${VALID_TEST_KEYS.join(', ')}, nhận được "${testKeyRaw}"`, lineNumber);
    }
    const gender = genderRaw.trim();
    if (!VALID_GENDERS.includes(gender)) {
      throw new LabReferenceImportError(`Dòng ${lineNumber}: gender phải là 'Nam', 'Nữ' hoặc 'Cả hai', nhận được "${genderRaw}"`, lineNumber);
    }
    const minMonths = Number(minMonthsRaw);
    const maxMonths = Number(maxMonthsRaw);
    if (!Number.isInteger(minMonths) || minMonths < 0) {
      throw new LabReferenceImportError(`Dòng ${lineNumber}: minMonths phải là số nguyên không âm, nhận được "${minMonthsRaw}"`, lineNumber);
    }
    if (!Number.isInteger(maxMonths) || maxMonths < minMonths) {
      throw new LabReferenceImportError(`Dòng ${lineNumber}: maxMonths phải là số nguyên ≥ minMonths, nhận được "${maxMonthsRaw}"`, lineNumber);
    }
    const lowSevere = parseNullableFloat(lowSevereRaw, 'lowSevere', lineNumber);
    const lowDeficit = parseNullableFloat(lowDeficitRaw, 'lowDeficit', lineNumber);
    const highBorderline = parseNullableFloat(highBorderlineRaw, 'highBorderline', lineNumber);
    const highExcess = parseNullableFloat(highExcessRaw, 'highExcess', lineNumber);
    if (lowSevere === null && lowDeficit === null && highBorderline === null && highExcess === null) {
      throw new LabReferenceImportError(`Dòng ${lineNumber}: phải có ít nhất 1 trong 4 ngưỡng (lowSevere/lowDeficit/highBorderline/highExcess)`, lineNumber);
    }
    const highInclusiveNormalized = highInclusiveRaw.trim().toLowerCase();
    if (highInclusiveNormalized !== '' && highInclusiveNormalized !== 'true' && highInclusiveNormalized !== 'false') {
      throw new LabReferenceImportError(`Dòng ${lineNumber}: highInclusive phải là 'true', 'false' hoặc để trống, nhận được "${highInclusiveRaw}"`, lineNumber);
    }
    const unit = unitRaw.trim();
    if (!unit) {
      throw new LabReferenceImportError(`Dòng ${lineNumber}: unit không được để trống`, lineNumber);
    }

    records.push({
      testKey: testKey as LabTestKey,
      gender: gender as 'Nam' | 'Nữ' | 'Cả hai',
      minMonths,
      maxMonths,
      lowSevere,
      lowDeficit,
      highBorderline,
      highExcess,
      highInclusive: highInclusiveNormalized === 'true',
      unit,
      source: sourceRaw.trim() || 'Không rõ nguồn',
    });
  }

  if (records.length === 0) {
    throw new LabReferenceImportError('CSV không có dòng dữ liệu hợp lệ nào');
  }

  return records;
}

/** Replaces the ENTIRE lab-reference table with the imported records, then refreshes the in-memory cache. */
export async function importLabReferenceRanges(prisma: PrismaClient, records: LabReferenceRange[]): Promise<number> {
  await prisma.$transaction([prisma.labReferenceRange.deleteMany(), prisma.labReferenceRange.createMany({ data: records })]);
  return loadFromDatabase(prisma);
}

export function exportLabReferenceRangesCsv(): string {
  const header = 'testKey,gender,minMonths,maxMonths,lowSevere,lowDeficit,highBorderline,highExcess,highInclusive,unit,source';
  const rows = getAllLabReferenceRanges().map((r) =>
    [
      r.testKey,
      r.gender,
      r.minMonths,
      r.maxMonths,
      r.lowSevere ?? '',
      r.lowDeficit ?? '',
      r.highBorderline ?? '',
      r.highExcess ?? '',
      r.highInclusive,
      r.unit,
      `"${r.source.replace(/"/g, '""')}"`,
    ].join(','),
  );
  return '﻿' + [header, ...rows].join('\n');
}
