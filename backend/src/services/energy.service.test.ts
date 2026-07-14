import { describe, expect, it } from 'vitest';
import { calcEnergy, calcMacros } from './energy.service';

describe('calcEnergy — bracket transitions', () => {
  it('m=5 vs m=6 (boy) crosses the first bracket', () => {
    expect(calcEnergy(5, true, 7, 0, 0, null).stdEnergy).toBe(550);
    expect(calcEnergy(6, true, 8, 0, 0, null).stdEnergy).toBe(700);
  });
  it('m=59 vs m=60 crosses a bracket', () => {
    expect(calcEnergy(59, true, 18, 0, 0, null).stdEnergy).toBe(1400);
    expect(calcEnergy(60, true, 18, 0, 0, null).stdEnergy).toBe(1500);
  });
  it('m=83 vs m=84 crosses a bracket', () => {
    expect(calcEnergy(83, true, 24, 0, 0, null).stdEnergy).toBe(1500);
    expect(calcEnergy(84, true, 24, 0, 0, null).stdEnergy).toBe(1700);
  });
  it('m=228 is the last tabulated bracket', () => {
    expect(calcEnergy(228, true, 60, 0, 0, null).stdEnergy).toBe(3000);
  });
  it('m=229 falls out of the table → default 1500 kcal', () => {
    expect(calcEnergy(229, true, 60, 0, 0, null).stdEnergy).toBe(1500);
  });
  it('gender split at the same month (m=20, within the 12-23 bracket)', () => {
    expect(calcEnergy(20, true, 12, 0, 0, null).stdEnergy).toBe(1000);
    expect(calcEnergy(20, false, 12, 0, 0, null).stdEnergy).toBe(950);
  });
});

describe('calcEnergy — obesity trigger via BFA (BMI-for-age Z-score, age-dependent SD cutoff — replaces the old flat bmi>=25 adult cutoff, see Bugs.md #1)', () => {
  it('m=61 (>60 tháng → ngưỡng lỏng +1SD): bfaZ=1.01 triggers the -20% reduction', () => {
    const r = calcEnergy(61, true, 20, 0, 0, 1.01);
    expect(r.targetEnergy).toBe(Math.round(r.stdEnergy * 0.8));
    expect(r.energyNoteType).toBe('warn');
  });
  it('m=61: bfaZ=1.0 exactly does NOT trigger it (strict >)', () => {
    const r = calcEnergy(61, true, 20, 0, 0, 1.0);
    expect(r.targetEnergy).toBe(r.stdEnergy);
    expect(r.energyNote).toBeNull();
  });
  it('m=60 (boundary — vẫn dùng ngưỡng chặt +2SD, KHÔNG phải +1SD): bfaZ=1.5 không trigger, phải khớp đúng wfhZ (Bugs.md #6)', () => {
    const r = calcEnergy(60, true, 20, 0, 0, 1.5);
    expect(r.targetEnergy).toBe(r.stdEnergy);
    expect(r.energyNote).toBeNull();
  });
  it('m=60: bfaZ=2.01 triggers the -20% reduction', () => {
    const r = calcEnergy(60, true, 20, 0, 0, 2.01);
    expect(r.targetEnergy).toBe(Math.round(r.stdEnergy * 0.8));
    expect(r.energyNoteType).toBe('warn');
  });
  it('m=24 (≤60 tháng → ngưỡng +2SD, chặt hơn): bfaZ=1.5 KHÔNG trigger dù đã vượt ngưỡng của nhóm >60 tháng', () => {
    const r = calcEnergy(24, true, 12, 0, 0, 1.5);
    expect(r.targetEnergy).toBe(r.stdEnergy);
    expect(r.energyNote).toBeNull();
  });
  it('m=24: bfaZ=2.01 triggers the -20% reduction', () => {
    const r = calcEnergy(24, true, 12, 0, 0, 2.01);
    expect(r.targetEnergy).toBe(Math.round(r.stdEnergy * 0.8));
    expect(r.energyNoteType).toBe('warn');
  });
  it('bfaZ=null (bảng WHO không phủ tới) không bao giờ tự trigger', () => {
    const r = calcEnergy(60, true, 20, 0, 0, null);
    expect(r.targetEnergy).toBe(1500);
  });
});

describe('calcEnergy — catch-up weight tiers (m<60, malnourished)', () => {
  it('weight=9.9 (< 10) → weight * 100', () => {
    expect(calcEnergy(24, true, 9.9, -2.5, -2.5, null).targetEnergy).toBe(Math.round(9.9 * 100));
  });
  it('weight=10.0 (boundary, not < 10) → uses the 10-20 formula', () => {
    expect(calcEnergy(24, true, 10.0, -2.5, -2.5, null).targetEnergy).toBe(Math.round(1000 + 50 * (10.0 - 10)));
  });
  it('weight=19.9 (< 20) → 10-20 formula', () => {
    expect(calcEnergy(24, true, 19.9, -2.5, -2.5, null).targetEnergy).toBe(Math.round(1000 + 50 * (19.9 - 10)));
  });
  it('weight=20.0 (boundary, not < 20) → uses the >=20 formula', () => {
    expect(calcEnergy(24, true, 20.0, -2.5, -2.5, null).targetEnergy).toBe(Math.round(1000 + 20 * (20.0 - 20)));
  });
  it('weight=25 → >=20 formula', () => {
    expect(calcEnergy(24, true, 25, -2.5, -2.5, null).targetEnergy).toBe(Math.round(1000 + 20 * (25 - 20)));
  });
});

describe('calcEnergy — catch-up for m>=60 uses stdEnergy+300', () => {
  it('m=60 malnourished (via wfaZ/wfhZ, bfaZ not relevant) → stdEnergy + 300', () => {
    const r = calcEnergy(60, true, 15, -2.5, -2.5, null);
    expect(r.targetEnergy).toBe(r.stdEnergy + 300);
    expect(r.energyNoteType).toBe('danger');
  });
  it('m=61 malnourished → stdEnergy + 300', () => {
    const r = calcEnergy(61, true, 15, -2.5, -2.5, null);
    expect(r.targetEnergy).toBe(r.stdEnergy + 300);
  });
  it('m=61 malnourished via bfaZ<-2 only (wfaZ/wfhZ null, như thực tế >60 tháng) → stdEnergy + 300', () => {
    const r = calcEnergy(61, true, 15, null, null, -2.5);
    expect(r.targetEnergy).toBe(r.stdEnergy + 300);
    expect(r.energyNoteType).toBe('danger');
  });
});

describe('calcEnergy — branch priority: obesity wins over malnutrition', () => {
  it('when bfaZ>overweightSd AND wfaZ<-2 both true, obesity branch applies (it is checked first)', () => {
    const r = calcEnergy(24, true, 20, -2.5, 0, 2.5);
    expect(r.energyNoteType).toBe('warn');
    expect(r.targetEnergy).toBe(Math.round(r.stdEnergy * 0.8));
  });
});

describe('calcMacros', () => {
  it('normal status → 50/20/30 split', () => {
    const m = calcMacros(1000, 'Bình thường');
    expect(m.carbG).toBe(Math.round((1000 * 0.5) / 4));
    expect(m.proteinG).toBe(Math.round((1000 * 0.2) / 4));
    expect(m.lipidG).toBe(Math.round((1000 * 0.3) / 9));
  });
  it('overweight/obese status → 35/35/30 split', () => {
    const m = calcMacros(1000, 'Thừa cân/Béo phì');
    expect(m.carbG).toBe(Math.round((1000 * 0.35) / 4));
    expect(m.proteinG).toBe(Math.round((1000 * 0.35) / 4));
    expect(m.lipidG).toBe(Math.round((1000 * 0.3) / 9));
  });
  it('malnutrition status → still 50/20/30 (only obesity/overweight changes the split)', () => {
    const m = calcMacros(1000, 'Suy dinh dưỡng');
    expect(m.carbG).toBe(Math.round((1000 * 0.5) / 4));
  });
});
