import { computeGrowthAlerts, type VisitPoint } from '@dinhduong/shared';
import { describe, expect, it } from 'vitest';

function visit(id: string, examDate: string, weight: number, height: number, wfaZ: number | null): VisitPoint {
  return { id, examDate, weight, height, wfaZ };
}

describe('computeGrowthAlerts', () => {
  it('single visit → no alerts (nothing to compare against)', () => {
    const alerts = computeGrowthAlerts([visit('v1', '2024-01-01', 12.3, 85, -1.0)]);
    expect(alerts.size).toBe(0);
  });

  describe('weight_loss rule', () => {
    it('12.3 -> 12.2 (loss of 0.1) → fires', () => {
      const alerts = computeGrowthAlerts([visit('v1', '2024-01-01', 12.3, 85, -1), visit('v2', '2024-02-01', 12.2, 85, -1)]);
      expect(alerts.get('v2')?.some((a) => a.type === 'weight_loss')).toBe(true);
    });
    it('12.2 -> 12.3 (gain) → does not fire', () => {
      const alerts = computeGrowthAlerts([visit('v1', '2024-01-01', 12.2, 85, -1), visit('v2', '2024-02-01', 12.3, 85, -1)]);
      expect(alerts.get('v2')?.some((a) => a.type === 'weight_loss')).toBeFalsy();
    });
    it('12.3 -> 12.3 (tie, incl. float-precision noise) → does not fire', () => {
      const alerts = computeGrowthAlerts([
        visit('v1', '2024-01-01', 12.3, 85, -1),
        visit('v2', '2024-02-01', 12.300000000001, 85, -1),
      ]);
      expect(alerts.get('v2')?.some((a) => a.type === 'weight_loss')).toBeFalsy();
    });
  });

  describe('growth_faltering rule (WFA Z-score)', () => {
    it('-1.0 -> -1.5 (delta exactly -0.5) → fires (boundary inclusive)', () => {
      const alerts = computeGrowthAlerts([visit('v1', '2024-01-01', 12, 85, -1.0), visit('v2', '2024-02-01', 12, 85, -1.5)]);
      expect(alerts.get('v2')?.some((a) => a.type === 'growth_faltering')).toBe(true);
    });
    it('-1.0 -> -1.49 (delta -0.49) → does not fire', () => {
      const alerts = computeGrowthAlerts([visit('v1', '2024-01-01', 12, 85, -1.0), visit('v2', '2024-02-01', 12, 85, -1.49)]);
      expect(alerts.get('v2')?.some((a) => a.type === 'growth_faltering')).toBeFalsy();
    });
    it('one side null (e.g. child aged past 60mo) → skipped without throwing', () => {
      expect(() =>
        computeGrowthAlerts([visit('v1', '2024-01-01', 12, 85, -1.0), visit('v2', '2024-02-01', 12, 85, null)]),
      ).not.toThrow();
      const alerts = computeGrowthAlerts([visit('v1', '2024-01-01', 12, 85, -1.0), visit('v2', '2024-02-01', 12, 85, null)]);
      expect(alerts.get('v2')?.some((a) => a.type === 'growth_faltering')).toBeFalsy();
    });
  });

  describe('stunting_risk rule (height stagnation)', () => {
    it('85.0 -> 85.05cm over 4 months → fires', () => {
      const alerts = computeGrowthAlerts([visit('v1', '2024-01-01', 12, 85.0, -1), visit('v2', '2024-05-01', 12, 85.05, -1)]);
      expect(alerts.get('v2')?.some((a) => a.type === 'stunting_risk')).toBe(true);
    });
    it('same delta over exactly 3 months → does not fire (interval must be > 3, strict)', () => {
      const alerts = computeGrowthAlerts([visit('v1', '2024-01-01', 12, 85.0, -1), visit('v2', '2024-04-01', 12, 85.05, -1)]);
      expect(alerts.get('v2')?.some((a) => a.type === 'stunting_risk')).toBeFalsy();
    });
    it('85.0 -> 85.2cm over 6 months (delta >= 0.1) → does not fire', () => {
      const alerts = computeGrowthAlerts([visit('v1', '2024-01-01', 12, 85.0, -1), visit('v2', '2024-07-01', 12, 85.2, -1)]);
      expect(alerts.get('v2')?.some((a) => a.type === 'stunting_risk')).toBeFalsy();
    });
  });

  it('a single transition can trigger all 3 alerts at once', () => {
    const alerts = computeGrowthAlerts([
      visit('v1', '2024-01-01', 12.3, 85.0, -1.0),
      visit('v2', '2024-06-01', 12.2, 85.02, -1.6),
    ]);
    expect(alerts.get('v2')).toHaveLength(3);
  });

  it('visits passed out of order are sorted by examDate before comparing', () => {
    const alerts = computeGrowthAlerts([visit('v2', '2024-02-01', 12.2, 85, -1), visit('v1', '2024-01-01', 12.3, 85, -1)]);
    expect(alerts.get('v2')?.some((a) => a.type === 'weight_loss')).toBe(true);
  });
});
