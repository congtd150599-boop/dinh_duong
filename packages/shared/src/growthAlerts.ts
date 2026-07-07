import { monthsBetween } from './date-utils';

export type GrowthAlertType = 'weight_loss' | 'growth_faltering' | 'stunting_risk';

export interface GrowthAlert {
  type: GrowthAlertType;
  severity: 'warning' | 'danger';
  message: string;
  previousVisitId: string;
  currentVisitId: string;
}

export interface VisitPoint {
  id: string;
  examDate: string; // ISO date
  weight: number;
  height: number;
  wfaZ: number | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * WHO-recommended growth-alert rules, compared between each pair of
 * consecutive visits (sorted by examDate) for one child:
 *   (a) any weight loss — children should always be gaining, not losing
 *   (b) WFA Z-score drop >= 0.5 SD — "growth faltering"
 *   (c) height essentially unchanged (<0.1cm) over an interval > 3 months — stunting risk
 * Weight/height are rounded to 1 decimal before comparing to avoid float-precision
 * false positives (inputs are entered with step="0.1"). Rule (b) is skipped
 * (not thrown) when either visit has no wfaZ (e.g. child older than 60 months).
 */
export function computeGrowthAlerts(visits: VisitPoint[]): Map<string, GrowthAlert[]> {
  const sorted = [...visits].sort((a, b) => a.examDate.localeCompare(b.examDate));
  const result = new Map<string, GrowthAlert[]>();

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const alerts: GrowthAlert[] = [];

    const weightDelta = round1(curr.weight - prev.weight);
    if (weightDelta < 0) {
      alerts.push({
        type: 'weight_loss',
        severity: 'danger',
        message: `Sụt ${Math.abs(weightDelta).toFixed(1)}kg so với lần khám ${prev.examDate.slice(0, 10)}`,
        previousVisitId: prev.id,
        currentVisitId: curr.id,
      });
    }

    if (prev.wfaZ != null && curr.wfaZ != null) {
      const zDelta = curr.wfaZ - prev.wfaZ;
      if (zDelta <= -0.5) {
        alerts.push({
          type: 'growth_faltering',
          severity: 'danger',
          message: `Z-score cân nặng/tuổi giảm ${Math.abs(zDelta).toFixed(2)} SD — nghi ngờ suy dinh dưỡng cấp (growth faltering)`,
          previousVisitId: prev.id,
          currentVisitId: curr.id,
        });
      }
    }

    const intervalMonths = monthsBetween(prev.examDate, curr.examDate);
    const heightDelta = Math.abs(round1(curr.height - prev.height));
    if (intervalMonths > 3 && heightDelta < 0.1) {
      alerts.push({
        type: 'stunting_risk',
        severity: 'warning',
        message: `Chiều cao gần như không đổi (${heightDelta.toFixed(2)}cm) sau ${intervalMonths} tháng — nguy cơ thấp còi`,
        previousVisitId: prev.id,
        currentVisitId: curr.id,
      });
    }

    if (alerts.length > 0) result.set(curr.id, alerts);
  }

  return result;
}
