// Real WHO LMS Z-score method (replaces the previous flat-coefficient
// approximation — see git history / project memory for that decision).
// Z = ((X/M)^L - 1) / (L*S) for L != 0, else ln(X/M)/S.
// L, M, S come from the official WHO reference tables (growth-standards.service.ts
// for WFA/HFA, wfh-lms.service.ts for WFH) — see backend/scripts/generate-lms-growth-data.mjs
// and backend/src/data/*.ts for sourcing.
import type { LmsParams } from './growth-standards.service';

export type ZType = 'wfa' | 'hfa' | 'wfh';

export function classifyZ(z: number, type: ZType): string {
  if (type === 'wfa') {
    if (z < -3) return 'Nhẹ cân nặng';
    if (z < -2) return 'Nhẹ cân';
    if (z > 2) return 'Thừa cân';
    return 'Bình thường';
  }
  if (type === 'hfa') {
    if (z < -3) return 'Thấp còi nặng';
    if (z < -2) return 'Thấp còi';
    if (z > 2) return 'Cao hơn chuẩn';
    return 'Bình thường';
  }
  // wfh
  if (z < -3) return 'SDD cấp nặng';
  if (z < -2) return 'Suy dinh dưỡng cấp';
  if (z > 3) return 'Béo phì';
  if (z > 2) return 'Thừa cân';
  return 'Bình thường';
}

export interface ZScores {
  wfaZ: number | null;
  wfhZ: number | null;
  hfaZ: number;
  wfa: string;
  hfa: string;
  wfh: string;
}

/** The standard WHO LMS Z-score formula. Exported for direct unit testing against known (l,m,s,x) tuples. */
export function computeLmsZ(x: number, lms: LmsParams): number {
  const { l, m, s } = lms;
  return l === 0 ? Math.log(x / m) / s : (Math.pow(x / m, l) - 1) / (l * s);
}

export function computeZScores(params: {
  weight: number;
  height: number;
  wfaLms: LmsParams | null;
  hfaLms: LmsParams | null;
  wfhLms: LmsParams | null;
}): ZScores {
  const { weight, height, wfaLms, hfaLms, wfhLms } = params;

  let wfaZ: number | null = null;
  let wfhZ: number | null = null;
  // wfaLms/wfhLms are null past 60 months (WHO doesn't publish either past 5y);
  // wfhLms can also be null within 0-60mo if the child's measured height/length
  // falls outside the WHO table's tabulated range (45-110cm / 65-120cm) — an
  // extremely rare edge case, kept distinct from the ">5 tuổi" message below.
  let wfa = 'Không áp dụng (>5 Tuổi)';
  let wfh = 'Không áp dụng (>5 Tuổi)';

  if (wfaLms) {
    wfaZ = computeLmsZ(weight, wfaLms);
    wfa = classifyZ(wfaZ, 'wfa');
  }
  if (wfhLms) {
    wfhZ = computeLmsZ(weight, wfhLms);
    wfh = classifyZ(wfhZ, 'wfh');
  } else if (wfaLms) {
    wfh = 'Không áp dụng (chiều cao ngoài bảng chuẩn)';
  }

  const hfaZ = hfaLms ? computeLmsZ(height, hfaLms) : 0;
  const hfa = classifyZ(hfaZ, 'hfa');

  return { wfaZ, wfhZ, hfaZ, wfa, hfa, wfh };
}
