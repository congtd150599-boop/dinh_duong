import type { Gender } from '@dinhduong/shared';
import { WFH_LMS_DEFAULT } from '../data/wfh-lms-who-default';
import type { LmsParams } from './growth-standards.service';

function keyOf(gender: Gender, table: 'length' | 'height', value: number): string {
  return `${gender}_${table}_${value}`;
}

const cache = new Map<string, LmsParams>();
for (const r of WFH_LMS_DEFAULT) {
  cache.set(keyOf(r.gender, r.table, r.value), { l: r.l, m: r.m, s: r.s });
}

/**
 * Real WHO weight-for-height/length LMS lookup — indexed by the child's
 * actual measured length/height (cm), not by age. WHO's own convention:
 * <24 months uses the recumbent length table, >=24 months uses the standing
 * height table. Returns null beyond 60 months (WHO doesn't publish WFH past
 * 5y) or if heightCm falls outside the tabulated range (45-110cm length /
 * 65-120cm height).
 */
export function getWfhLms(gender: Gender, months: number, heightCm: number): LmsParams | null {
  if (months > 60) return null;
  const table = months < 24 ? 'length' : 'height';
  const rounded = Math.round(heightCm * 10) / 10;
  return cache.get(keyOf(gender, table, rounded)) ?? null;
}
