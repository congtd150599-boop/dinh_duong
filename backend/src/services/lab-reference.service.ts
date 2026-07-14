import type { PrismaClient } from '@prisma/client';
import type { LabTestKey } from '@dinhduong/shared';
import { DEFAULT_LAB_REFERENCE_RANGES } from '../data/lab-reference-ranges-default';

export interface LabReferenceRange {
  testKey: LabTestKey;
  gender: 'Nam' | 'Nữ' | 'Cả hai';
  minMonths: number;
  maxMonths: number;
  lowSevere: number | null;
  lowDeficit: number | null;
  highBorderline: number | null;
  highExcess: number | null;
  highInclusive: boolean;
  unit: string;
  source: string;
}

// In-memory cache — the calculation engine reads from here synchronously on
// every request, never hitting the DB directly. Loaded from the bundled
// default at module init (so tests and a fresh server both work with zero DB
// dependency), replaced wholesale by loadFromDatabase() after an import,
// without needing a server restart. Same pattern as growth-standards.service.ts.
let cache: LabReferenceRange[] = [];

export function loadRecords(records: LabReferenceRange[]): void {
  cache = records;
}

loadRecords(DEFAULT_LAB_REFERENCE_RANGES);

/**
 * Finds the reference range for one test, given the patient's gender and age
 * in months. Rows are age-*ranged* (minMonths-maxMonths), not exact-month
 * keyed like GrowthStandardPoint, so this is a linear scan — fine at this
 * table's size (~15 rows total across all 8 tests). A row with
 * gender='Cả hai' matches a patient of either gender; a gender-specific row
 * only matches that gender (see Fe, the only test currently split this way).
 */
export function getLabReferenceRange(testKey: LabTestKey, gender: 'Nam' | 'Nữ', months: number): LabReferenceRange | null {
  return (
    cache.find(
      (r) => r.testKey === testKey && (r.gender === gender || r.gender === 'Cả hai') && months >= r.minMonths && months <= r.maxMonths,
    ) ?? null
  );
}

export function getAllLabReferenceRanges(): LabReferenceRange[] {
  return [...cache].sort(
    (a, b) => a.testKey.localeCompare(b.testKey) || a.gender.localeCompare(b.gender) || a.minMonths - b.minMonths,
  );
}

/** Loads the cache from the database. Returns the number of rows loaded (0 = DB empty, default stays active). */
export async function loadFromDatabase(prisma: PrismaClient): Promise<number> {
  const rows = await prisma.labReferenceRange.findMany();
  if (rows.length === 0) return 0;
  loadRecords(
    rows.map((r) => ({
      testKey: r.testKey as LabTestKey,
      gender: r.gender as 'Nam' | 'Nữ' | 'Cả hai',
      minMonths: r.minMonths,
      maxMonths: r.maxMonths,
      lowSevere: r.lowSevere,
      lowDeficit: r.lowDeficit,
      highBorderline: r.highBorderline,
      highExcess: r.highExcess,
      highInclusive: r.highInclusive,
      unit: r.unit,
      source: r.source,
    })),
  );
  return rows.length;
}
