import { describe, expect, it } from 'vitest';
import { runAssessment } from './assessment.service';

const baseInput = {
  name: 'Test Patient',
  dob: '2024-01-01',
  tuvan: 'Có' as const,
  revisit: null,
  labs: {},
};

describe('runAssessment — normal growth at exact WHO median (m=24, boy)', () => {
  // WHO_BOYS_WFA[24]=12.2, WHO_BOYS_HFA[24]=87.8 — hand-verified expected values below.
  const result = runAssessment({
    ...baseInput,
    examDate: '2026-01-01', // 24 months after dob
    gender: 'Nam',
    weight: 12.2,
    height: 87.8,
  });

  it('computes months and BMI correctly', () => {
    expect(result.months).toBe(24);
    expect(result.bmi).toBe(15.8);
  });
  it('all Z-scores land on Bình thường', () => {
    expect(result.wfa).toBe('Bình thường');
    expect(result.hfa).toBe('Bình thường');
    expect(result.wfh).toBe('Bình thường');
    expect(result.statusKey).toBe('Bình thường');
  });
  it('energy: no adjustment note, stdEnergy === targetEnergy', () => {
    expect(result.stdEnergy).toBe(1200);
    expect(result.targetEnergy).toBe(1200);
    expect(result.energyNote).toBeNull();
  });
  it('macros: 50/20/30 split of 1200 kcal', () => {
    expect(result.carbG).toBe(150);
    expect(result.proteinG).toBe(60);
    expect(result.lipidG).toBe(40);
  });
  it('selects the 3-5y_Bình thường menu (ageKey boundary quirk: `m < 24` means m=24 already falls in the 3-5y bucket, not 12-24m)', () => {
    expect(result.menuKey).toBe('3-5y_Bình thường');
  });
});

describe('runAssessment — overweight/obesity via WFH (m=24, boy, median height, high weight)', () => {
  const result = runAssessment({
    ...baseInput,
    examDate: '2026-01-01',
    gender: 'Nam',
    weight: 17.5,
    height: 87.8,
  });

  it('wfh classifies as Béo phì, wfa as Thừa cân, hfa stays normal', () => {
    expect(result.wfh).toBe('Béo phì');
    expect(result.wfa).toBe('Thừa cân');
    expect(result.hfa).toBe('Bình thường');
  });
  it('statusKey becomes Thừa cân/Béo phì, triggering the -20% energy reduction', () => {
    expect(result.statusKey).toBe('Thừa cân/Béo phì');
    expect(result.stdEnergy).toBe(1200);
    expect(result.targetEnergy).toBe(960);
    expect(result.energyNoteType).toBe('warn');
  });
  it('macros use the 35/35/30 obesity split', () => {
    expect(result.carbG).toBe(84);
    expect(result.proteinG).toBe(84);
    expect(result.lipidG).toBe(32);
  });
  it('selects the 3-5y_Thừa cân/Béo phì menu (same ageKey boundary quirk as above)', () => {
    expect(result.menuKey).toBe('3-5y_Thừa cân/Béo phì');
  });
});

describe('runAssessment — severe stunting takes priority over WFH-driven overweight in the branch chain', () => {
  // m=24 boy, weight at median (wfaZ=0) but height far below median → hfaZ<-3,
  // which incidentally pushes wfhZ way above 2 too (severely short-for-weight —
  // the real WHO weight-for-height table says a 70cm-tall child should weigh
  // ~8.6kg, so 12.2kg reads as severe obesity-for-height, not just "overweight").
  // The legacy if/else-if chain checks malnutrition, then stunting, THEN
  // overweight — so stunting wins here regardless of the wfh label.
  const result = runAssessment({
    ...baseInput,
    examDate: '2026-01-01',
    gender: 'Nam',
    weight: 12.2,
    height: 70,
  });

  it('hfa is severely stunted', () => {
    expect(result.hfa).toBe('Thấp còi nặng');
    expect(result.hfaZ).toBeLessThan(-3);
  });
  it('wfh happens to read as Béo phì in isolation, but statusKey is driven by stunting', () => {
    expect(result.wfh).toBe('Béo phì');
    expect(result.wfa).toBe('Bình thường');
    expect(result.statusKey).toBe('Suy dinh dưỡng');
  });
});

describe('runAssessment — moderate and severe wasting via WFH', () => {
  it('moderate wasting (-3<wfhZ<-2) → Suy dinh dưỡng cấp, statusKey Suy dinh dưỡng', () => {
    const result = runAssessment({
      ...baseInput,
      examDate: '2026-01-01',
      gender: 'Nam',
      weight: 10, // real WHO WFH LMS at height=87.8 (Nam) puts this at Z≈-2.73
      height: 87.8,
    });
    expect(result.wfhZ).toBeGreaterThan(-3);
    expect(result.wfhZ).toBeLessThan(-2);
    expect(result.wfh).toBe('Suy dinh dưỡng cấp');
    expect(result.statusKey).toBe('Suy dinh dưỡng');
  });
  it('severe wasting (wfhZ<-3) → SDD cấp nặng', () => {
    const result = runAssessment({
      ...baseInput,
      examDate: '2026-01-01',
      gender: 'Nam',
      weight: 7,
      height: 87.8,
    });
    expect(result.wfh).toBe('SDD cấp nặng');
    expect(result.statusKey).toBe('Suy dinh dưỡng');
  });
});

describe('runAssessment — m=60 vs m=61 boundary (WFA/WFH become N/A beyond 5y)', () => {
  it('m=60 (exactly 5y): WFA/WFH still apply', () => {
    const result = runAssessment({
      ...baseInput,
      examDate: '2029-01-01', // 60 months after 2024-01-01
      gender: 'Nam',
      weight: 18.3, // WHO Child Growth Standards 2006 median at m=60
      height: 110, // ditto
    });
    expect(result.months).toBe(60);
    expect(result.whoWeight).toBe(18.3);
    expect(result.wfa).not.toBe('Không áp dụng (>5 Tuổi)');
  });
  it('m=61: WFA/WFH become N/A, HFA still computed', () => {
    const result = runAssessment({
      ...baseInput,
      examDate: '2029-02-01', // 61 months after 2024-01-01
      gender: 'Nam',
      weight: 15,
      height: 113.5,
    });
    expect(result.months).toBe(61);
    expect(result.whoWeight).toBeNull();
    expect(result.wfaZ).toBeNull();
    expect(result.wfhZ).toBeNull();
    expect(result.wfa).toBe('Không áp dụng (>5 Tuổi)');
    expect(result.wfh).toBe('Không áp dụng (>5 Tuổi)');
    expect(result.hfa).toBe('Bình thường');
  });
});

describe('runAssessment — MUAC status thresholds', () => {
  it('muac < 11.5 → severe acute malnutrition flag', () => {
    const result = runAssessment({ ...baseInput, examDate: '2026-01-01', gender: 'Nam', weight: 12.2, height: 87.8, muac: 11.0 });
    expect(result.muacStatus).toContain('SDD CẤP NẶNG');
  });
  it('muac between 11.5 and 12.5 → moderate acute malnutrition flag', () => {
    const result = runAssessment({ ...baseInput, examDate: '2026-01-01', gender: 'Nam', weight: 12.2, height: 87.8, muac: 12.0 });
    expect(result.muacStatus).toContain('SDD CẤP VỪA');
  });
  it('muac >= 12.5 → normal', () => {
    const result = runAssessment({ ...baseInput, examDate: '2026-01-01', gender: 'Nam', weight: 12.2, height: 87.8, muac: 13.0 });
    expect(result.muacStatus).toContain('Bình thường');
  });
  it('no muac provided → null, not a default status', () => {
    const result = runAssessment({ ...baseInput, examDate: '2026-01-01', gender: 'Nam', weight: 12.2, height: 87.8 });
    expect(result.muacStatus).toBeNull();
  });
});
