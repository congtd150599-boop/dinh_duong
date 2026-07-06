import type { PrismaClient } from '@prisma/client';
import type { Gender } from '@dinhduong/shared';
import { getAllRecords, loadFromDatabase, type GrowthMetric, type GrowthStandardRecord } from './growth-standards.service';

export class GrowthStandardsImportError extends Error {
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

const VALID_GENDERS: Gender[] = ['Nam', 'Nữ'];
const VALID_METRICS: GrowthMetric[] = ['WFA', 'HFA'];

/**
 * Parses a CSV with header `gender,metric,months,median,source`. Throws
 * GrowthStandardsImportError with a 1-based line number on the first
 * malformed row — callers should reject the whole import rather than
 * partially apply it (a half-imported reference table is worse than none).
 */
export function parseGrowthStandardsCsv(csvText: string): GrowthStandardRecord[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) throw new GrowthStandardsImportError('CSV rỗng hoặc thiếu dữ liệu (chỉ có header)');

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const expected = ['gender', 'metric', 'months', 'median', 'source'];
  if (expected.some((col, i) => header[i] !== col)) {
    throw new GrowthStandardsImportError(`Header phải đúng thứ tự: ${expected.join(',')} (nhận được: ${header.join(',')})`, 1);
  }

  const records: GrowthStandardRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    if (!lines[i].trim()) continue;
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 5) {
      throw new GrowthStandardsImportError(`Dòng ${lineNumber}: thiếu cột (cần đủ 5 cột, có ${cols.length})`, lineNumber);
    }
    const [genderRaw, metricRaw, monthsRaw, medianRaw, source] = cols;
    const gender = genderRaw.trim();
    const metric = metricRaw.trim().toUpperCase();
    if (!VALID_GENDERS.includes(gender as Gender)) {
      throw new GrowthStandardsImportError(`Dòng ${lineNumber}: gender phải là 'Nam' hoặc 'Nữ', nhận được "${genderRaw}"`, lineNumber);
    }
    if (!VALID_METRICS.includes(metric as GrowthMetric)) {
      throw new GrowthStandardsImportError(`Dòng ${lineNumber}: metric phải là 'WFA' hoặc 'HFA', nhận được "${metricRaw}"`, lineNumber);
    }
    const months = Number(monthsRaw);
    if (!Number.isInteger(months) || months < 0) {
      throw new GrowthStandardsImportError(`Dòng ${lineNumber}: months phải là số nguyên không âm, nhận được "${monthsRaw}"`, lineNumber);
    }
    const median = Number(medianRaw);
    if (!Number.isFinite(median) || median <= 0) {
      throw new GrowthStandardsImportError(`Dòng ${lineNumber}: median phải là số dương, nhận được "${medianRaw}"`, lineNumber);
    }
    records.push({ gender: gender as Gender, metric: metric as GrowthMetric, months, median, source: source.trim() || 'Không rõ nguồn' });
  }

  if (records.length === 0) {
    throw new GrowthStandardsImportError('CSV không có dòng dữ liệu hợp lệ nào');
  }

  return records;
}

/** Replaces the ENTIRE growth-standards table with the imported records, then refreshes the in-memory cache. */
export async function importGrowthStandards(prisma: PrismaClient, records: GrowthStandardRecord[]): Promise<number> {
  await prisma.$transaction([
    prisma.growthStandardPoint.deleteMany(),
    prisma.growthStandardPoint.createMany({ data: records }),
  ]);
  return loadFromDatabase(prisma);
}

export function exportGrowthStandardsCsv(): string {
  const header = 'gender,metric,months,median,source';
  const rows = getAllRecords().map((r) => [r.gender, r.metric, r.months, r.median, `"${r.source.replace(/"/g, '""')}"`].join(','));
  return '﻿' + [header, ...rows].join('\n');
}
