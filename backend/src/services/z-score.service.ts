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
    // WHO/Bộ Y Tế (Bảng 1, "Hướng dẫn điều trị Nhi khoa 2025" tr.148) chỉ định
    // nghĩa Cân nặng/tuổi đi xuống (Nhẹ cân/Nhẹ cân nặng) — không có hàng
    // "Thừa cân" cho cột này; overweight chỉ được định nghĩa trên CN/CC hoặc
    // BMI/tuổi (xem classifyBfaZ). Trước đây z>2 trả 'Thừa cân' ở đây — sai,
    // vì cân nặng/tuổi không phân biệt được trẻ cao-nặng cân đối với trẻ thật
    // sự thừa cân (xem Bugs.md #4).
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

/**
 * BMI-for-age (BFA) classification — the indicator Bộ Y Tế mandates for
 * overweight/obesity from birth to 19y (Bảng 1, tr.148), with different SD
 * cutoffs at the 60-month boundary: ≤60 tháng dùng +2SD/+3SD (giống hệt
 * WFH), sau 60 tháng dùng +1SD/+2SD (WHO 2007). Boundary is `<= 60`, not
 * `< 60` — phải khớp đúng wfh-lms.service.ts (`months > 60` mới trả null,
 * tức tháng 60 vẫn dùng chuẩn WFH/2006); lệch 1 tháng ở đây từng khiến wfhZ
 * và bfaZ dùng 2 bộ ngưỡng khác nhau cho cùng 1 lần khám ở đúng tháng 60 —
 * xem Bugs.md #6. This is what replaces the old flat "bmi >= 25" adult
 * cutoff — see Bugs.md #1. Reuses the wfh wasting labels at the low end
 * since Bảng 1 presents CN/CC và BMI/tuổi as one merged column.
 */
export function classifyBfaZ(z: number, months: number): string {
  const obeseSd = months <= 60 ? 3 : 2;
  const overweightSd = months <= 60 ? 2 : 1;
  if (z < -3) return 'SDD cấp nặng';
  if (z < -2) return 'Suy dinh dưỡng cấp';
  if (z > obeseSd) return 'Béo phì';
  if (z > overweightSd) return 'Thừa cân';
  return 'Bình thường';
}

export interface ZScores {
  wfaZ: number | null;
  wfhZ: number | null;
  hfaZ: number;
  bfaZ: number | null;
  wfa: string;
  hfa: string;
  wfh: string;
  bfa: string;
}

/** The standard WHO LMS Z-score formula. Exported for direct unit testing against known (l,m,s,x) tuples. */
export function computeLmsZ(x: number, lms: LmsParams): number {
  const { l, m, s } = lms;
  return l === 0 ? Math.log(x / m) / s : (Math.pow(x / m, l) - 1) / (l * s);
}

export function computeZScores(params: {
  weight: number;
  height: number;
  bmi: number;
  months: number;
  wfaLms: LmsParams | null;
  hfaLms: LmsParams | null;
  wfhLms: LmsParams | null;
  bfaLms: LmsParams | null;
}): ZScores {
  const { weight, height, bmi, months, wfaLms, hfaLms, wfhLms, bfaLms } = params;

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

  // BMI-for-age — computed across the full 0-228 month range (bfaLms is only
  // ever null outside it). Drives overweight/obesity past 60 months, where
  // wfaLms/wfhLms above are always null; see assessment.service.ts.
  let bfaZ: number | null = null;
  let bfa = 'Không áp dụng';
  if (bfaLms) {
    bfaZ = computeLmsZ(bmi, bfaLms);
    bfa = classifyBfaZ(bfaZ, months);
  }

  return { wfaZ, wfhZ, hfaZ, bfaZ, wfa, hfa, wfh, bfa };
}
