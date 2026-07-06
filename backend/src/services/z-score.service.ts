// Verbatim port of legacy/index.html classifyZ() (lines 2344-2364) and the inline
// Z-score math from calculate() (lines 2192-2201).
//
// NOTE — clinical risk flag (see project memory / plan "Bối cảnh"): this is the
// ORIGINAL simplified approximation, NOT the real WHO LMS method. It computes
// Z as a fixed-coefficient percentage deviation from the median:
//   Z = (value - median) / (median * coefficient)
// where coefficient is 0.14 (WFA), 0.12 (WFH), 0.06 (HFA). Do not "fix" this
// without an explicit, separately-tracked decision — tests below intentionally
// pin this exact (approximate) formula.

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

export function computeZScores(params: {
  weight: number;
  height: number;
  whoWeight: number | null;
  whoHeight: number;
}): ZScores {
  const { weight, height, whoWeight, whoHeight } = params;

  let wfaZ: number | null = null;
  let wfhZ: number | null = null;
  let wfa = 'Không áp dụng (>5 Tuổi)';
  let wfh = 'Không áp dụng (>5 Tuổi)';

  if (whoWeight !== null) {
    wfaZ = (weight - whoWeight) / (whoWeight * 0.14);
    const wfhRef = whoWeight * (height / whoHeight);
    wfhZ = (weight - wfhRef) / (wfhRef * 0.12);
    wfa = classifyZ(wfaZ, 'wfa');
    wfh = classifyZ(wfhZ, 'wfh');
  }

  const hfaZ = (height - whoHeight) / (whoHeight * 0.06);
  const hfa = classifyZ(hfaZ, 'hfa');

  return { wfaZ, wfhZ, hfaZ, wfa, hfa, wfh };
}
