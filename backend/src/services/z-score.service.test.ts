import { describe, expect, it } from 'vitest';
import { classifyBfaZ, classifyZ, computeLmsZ } from './z-score.service';

describe('computeLmsZ — real WHO LMS formula (replaces the old flat-coefficient approximation)', () => {
  it('X exactly at the median (M) → Z = 0, for both the L≠0 and L=0 branches', () => {
    expect(computeLmsZ(75.7, { l: 1, m: 75.7, s: 0.03137 })).toBeCloseTo(0, 6);
    expect(computeLmsZ(10, { l: 0, m: 10, s: 0.1 })).toBeCloseTo(0, 6);
  });

  it('L=0 branch uses ln(X/M)/S directly', () => {
    // X = M * e^(S*Z)  =>  at Z=1, X = 10 * e^0.1
    expect(computeLmsZ(10 * Math.exp(0.1), { l: 0, m: 10, s: 0.1 })).toBeCloseTo(1, 6);
  });

  it('L≠0 branch matches a hand-verified WHO reference point (Nam, HFA, month=12: l=1, m=75.7, s=0.03137)', () => {
    // With l=1 the formula reduces to (X/M - 1)/S, so M*(1+S) should give Z=1 exactly.
    const lms = { l: 1, m: 75.7, s: 0.03137 };
    expect(computeLmsZ(75.7 * 1.03137, lms)).toBeCloseTo(1, 6);
    expect(computeLmsZ(75.7 * (1 - 0.03137), lms)).toBeCloseTo(-1, 6);
  });

  it('L≠0, L negative — a real skewed WFA reference point (Nam, WFA, month=24: l=-0.0136, m=12.1, s=0.11425)', () => {
    // Cross-checked directly against the WHO source data during the LMS
    // migration — pins the formula's sign/shape, not just a round-trip.
    const lms = { l: -0.0136, m: 12.1, s: 0.11425 };
    expect(computeLmsZ(12.1, lms)).toBeCloseTo(0, 6);
    expect(computeLmsZ(15.2, lms)).toBeCloseTo(1.9933, 3);
    expect(computeLmsZ(9.4, lms)).toBeCloseTo(-2.2138, 3);
  });
});

describe('classifyZ — wfa boundaries', () => {
  it('z = -3.01 → Nhẹ cân nặng (severe)', () => {
    expect(classifyZ(-3.01, 'wfa')).toBe('Nhẹ cân nặng');
  });
  it('z = -3.0 exactly → Nhẹ cân (NOT severe — code uses strict <)', () => {
    expect(classifyZ(-3.0, 'wfa')).toBe('Nhẹ cân');
  });
  it('z = -2.01 → Nhẹ cân', () => {
    expect(classifyZ(-2.01, 'wfa')).toBe('Nhẹ cân');
  });
  it('z = -2.0 exactly → Bình thường (NOT Nhẹ cân)', () => {
    expect(classifyZ(-2.0, 'wfa')).toBe('Bình thường');
  });
  it('z = 2.0 exactly → Bình thường', () => {
    expect(classifyZ(2.0, 'wfa')).toBe('Bình thường');
  });
  it('z = 2.01 → still Bình thường — WFA has no "Thừa cân" category (Bảng 1 chỉ định nghĩa CN/tuổi đi xuống, xem Bugs.md #4)', () => {
    expect(classifyZ(2.01, 'wfa')).toBe('Bình thường');
  });
});

describe('classifyZ — hfa boundaries', () => {
  it('z = -3.01 → Thấp còi nặng', () => {
    expect(classifyZ(-3.01, 'hfa')).toBe('Thấp còi nặng');
  });
  it('z = -3.0 exactly → Thấp còi (not severe)', () => {
    expect(classifyZ(-3.0, 'hfa')).toBe('Thấp còi');
  });
  it('z = -2.01 → Thấp còi', () => {
    expect(classifyZ(-2.01, 'hfa')).toBe('Thấp còi');
  });
  it('z = -2.0 exactly → Bình thường', () => {
    expect(classifyZ(-2.0, 'hfa')).toBe('Bình thường');
  });
  it('z = 2.0 exactly → Bình thường', () => {
    expect(classifyZ(2.0, 'hfa')).toBe('Bình thường');
  });
  it('z = 2.01 → Cao hơn chuẩn', () => {
    expect(classifyZ(2.01, 'hfa')).toBe('Cao hơn chuẩn');
  });
});

describe('classifyZ — wfh boundaries', () => {
  it('z = -3.01 → SDD cấp nặng', () => {
    expect(classifyZ(-3.01, 'wfh')).toBe('SDD cấp nặng');
  });
  it('z = -3.0 exactly → Suy dinh dưỡng cấp (not severe)', () => {
    expect(classifyZ(-3.0, 'wfh')).toBe('Suy dinh dưỡng cấp');
  });
  it('z = -2.01 → Suy dinh dưỡng cấp', () => {
    expect(classifyZ(-2.01, 'wfh')).toBe('Suy dinh dưỡng cấp');
  });
  it('z = -2.0 exactly → Bình thường', () => {
    expect(classifyZ(-2.0, 'wfh')).toBe('Bình thường');
  });
  it('z = 2.0 exactly → Bình thường', () => {
    expect(classifyZ(2.0, 'wfh')).toBe('Bình thường');
  });
  it('z = 2.5 → Thừa cân (NOT Béo phì)', () => {
    expect(classifyZ(2.5, 'wfh')).toBe('Thừa cân');
  });
  it('z = 3.0 exactly → Thừa cân (not yet Béo phì)', () => {
    expect(classifyZ(3.0, 'wfh')).toBe('Thừa cân');
  });
  it('z = 3.01 → Béo phì', () => {
    expect(classifyZ(3.01, 'wfh')).toBe('Béo phì');
  });
});

describe('classifyBfaZ — BMI-for-age, age-dependent SD cutoffs (Bảng 1, "Hướng dẫn điều trị Nhi khoa 2025" tr.148)', () => {
  it('≤60 tháng dùng ngưỡng +2SD/+3SD (giống WFH)', () => {
    expect(classifyBfaZ(2.0, 24)).toBe('Bình thường');
    expect(classifyBfaZ(2.01, 24)).toBe('Thừa cân');
    expect(classifyBfaZ(3.0, 24)).toBe('Thừa cân');
    expect(classifyBfaZ(3.01, 24)).toBe('Béo phì');
  });
  it('tháng 60 chẵn vẫn dùng ngưỡng chặt +2SD/+3SD — mốc là "<= 60", không phải "< 60" (Bugs.md #6, phải khớp wfh-lms.service.ts)', () => {
    expect(classifyBfaZ(2.0, 60)).toBe('Bình thường');
    expect(classifyBfaZ(2.01, 60)).toBe('Thừa cân');
  });
  it('>60 tháng dùng ngưỡng +1SD/+2SD (WHO 2007) — lỏng hơn hẳn ≤60 tháng', () => {
    expect(classifyBfaZ(1.0, 61)).toBe('Bình thường');
    expect(classifyBfaZ(1.01, 61)).toBe('Thừa cân');
    expect(classifyBfaZ(2.0, 61)).toBe('Thừa cân');
    expect(classifyBfaZ(2.01, 61)).toBe('Béo phì');
  });
  it('đầu dưới dùng chung ngưỡng -2SD/-3SD ở mọi tuổi, nhãn giống wfh', () => {
    expect(classifyBfaZ(-2.01, 24)).toBe('Suy dinh dưỡng cấp');
    expect(classifyBfaZ(-3.01, 120)).toBe('SDD cấp nặng');
  });
});
