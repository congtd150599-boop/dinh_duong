import type { Gender } from '@dinhduong/shared';
import { BFA_LMS_DEFAULT } from '../data/bfa-lms-who-default';
import type { LmsParams } from './growth-standards.service';

function keyOf(gender: Gender, months: number): string {
  return `${gender}_${months}`;
}

const cache = new Map<string, LmsParams>();
for (const r of BFA_LMS_DEFAULT) {
  cache.set(keyOf(r.gender, r.months), { l: r.l, m: r.m, s: r.s });
}

/**
 * Real WHO BMI-for-age LMS lookup, 0-228 months — powers overweight/obesity
 * classification for ages where WFH is not published (>60 months), replacing
 * the previous flat adult BMI>=25 cutoff. See z-score.service.ts (classifyBfaZ)
 * for the age-dependent SD cutoffs and Bugs.md #1 for the full writeup.
 */
export function getBfaLms(gender: Gender, months: number): LmsParams | null {
  const capped = Math.min(months, 228);
  return cache.get(keyOf(gender, capped)) ?? null;
}
