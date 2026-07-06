import type { PrismaClient } from '@prisma/client';
import type { Gender } from '@dinhduong/shared';
import { DEFAULT_GROWTH_STANDARDS } from '../data/growth-standards-who-default';

export type GrowthMetric = 'WFA' | 'HFA';

export interface GrowthStandardRecord {
  gender: Gender;
  metric: GrowthMetric;
  months: number;
  median: number;
  source: string;
}

function keyOf(gender: Gender, metric: GrowthMetric, months: number): string {
  return `${gender}_${metric}_${months}`;
}

// In-memory cache — the calculation engine reads from here synchronously on
// every request, never hitting the DB directly. Loaded from the bundled WHO
// default at module init (so tests and a fresh server both work with zero
// DB dependency), and can be replaced wholesale by loadFromDatabase() after
// an import, without needing a server restart.
let cache = new Map<string, GrowthStandardRecord>();

export function loadRecords(records: GrowthStandardRecord[]): void {
  const next = new Map<string, GrowthStandardRecord>();
  for (const r of records) next.set(keyOf(r.gender, r.metric, r.months), r);
  cache = next;
}

loadRecords(DEFAULT_GROWTH_STANDARDS);

/** WHO weight-for-age median (kg) is only tabulated up to 60 months; returns null beyond that. */
export function getWfaMedian(gender: Gender, months: number): number | null {
  if (months > 60) return null;
  return cache.get(keyOf(gender, 'WFA', months))?.median ?? null;
}

/** WHO height-for-age median (cm), capped at the table's max of 228 months (19y). */
export function getHfaMedian(gender: Gender, months: number): number {
  const capped = Math.min(months, 228);
  return cache.get(keyOf(gender, 'HFA', capped))?.median ?? cache.get(keyOf(gender, 'HFA', 228))?.median ?? 150;
}

export function getAllRecords(): GrowthStandardRecord[] {
  return [...cache.values()].sort((a, b) => a.gender.localeCompare(a.gender) || a.metric.localeCompare(b.metric) || a.months - b.months);
}

/** Loads the cache from the database. Returns the number of rows loaded (0 = DB empty, default stays active). */
export async function loadFromDatabase(prisma: PrismaClient): Promise<number> {
  const rows = await prisma.growthStandardPoint.findMany();
  if (rows.length === 0) return 0;
  loadRecords(
    rows.map((r) => ({
      gender: r.gender as Gender,
      metric: r.metric as GrowthMetric,
      months: r.months,
      median: r.median,
      source: r.source,
    })),
  );
  return rows.length;
}
