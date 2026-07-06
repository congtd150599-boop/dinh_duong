import type { GrowthStandardRecord } from '../../api/growthStandards';
import type { CurvePoint } from './GrowthCurveChart';

export function buildCurvePoints(records: GrowthStandardRecord[], metric: 'WFA' | 'HFA'): CurvePoint[] {
  const byMonths = new Map<number, CurvePoint>();
  for (const r of records) {
    if (r.metric !== metric) continue;
    const entry = byMonths.get(r.months) ?? { months: r.months, nam: null, nu: null };
    if (r.gender === 'Nam') entry.nam = r.median;
    else entry.nu = r.median;
    byMonths.set(r.months, entry);
  }
  return [...byMonths.values()].sort((a, b) => a.months - b.months);
}
