import type { PrismaClient } from '@prisma/client';
import type { Gender } from '@dinhduong/shared';
import { DEFAULT_GROWTH_STANDARDS } from '../data/growth-standards-who-default';

export type GrowthMetric = 'WFA' | 'HFA';

export interface GrowthStandardRecord {
  gender: Gender;
  metric: GrowthMetric;
  months: number;
  median: number; // the LMS "M" parameter
  l: number | null; // LMS "L" (skewness) — null only for legacy rows imported before the LMS upgrade
  s: number | null; // LMS "S" (coefficient of variation)
  source: string;
}

export interface LmsParams {
  l: number;
  m: number;
  s: number;
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

/** Real WHO LMS parameters for weight-for-age — powers the actual Z-score math (see z-score.service.ts). Null past 60 months or if this row predates the LMS upgrade. */
export function getWfaLms(gender: Gender, months: number): LmsParams | null {
  if (months > 60) return null;
  const r = cache.get(keyOf(gender, 'WFA', months));
  if (!r || r.l == null || r.s == null) return null;
  return { l: r.l, m: r.median, s: r.s };
}

/** Real WHO LMS parameters for height-for-age, capped at 228 months like getHfaMedian. */
export function getHfaLms(gender: Gender, months: number): LmsParams | null {
  const capped = Math.min(months, 228);
  const r = cache.get(keyOf(gender, 'HFA', capped)) ?? cache.get(keyOf(gender, 'HFA', 228));
  if (!r || r.l == null || r.s == null) return null;
  return { l: r.l, m: r.median, s: r.s };
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
      l: r.l,
      s: r.s,
      source: r.source,
    })),
  );
  return rows.length;
}
