import type { PrismaClient } from '@prisma/client';
import type {
  ClinicStatsReport,
  InterventionDetail,
  InterventionEffectivenessStats,
  InterventionOutcome,
  MonthlyNutritionStat,
} from '@dinhduong/shared';

// Same wfh (Cân nặng/Chiều cao — WHO) categories LogTab.tsx already uses for its
// filtered-list stat tiles, kept here as the source of truth for this report too.
const SDD_STATUSES = new Set(['SDD cấp nặng', 'Suy dinh dưỡng cấp']);
const OVERWEIGHT_STATUSES = new Set(['Thừa cân', 'Béo phì']);

function classify(wfh: string): 'sdd' | 'overweight' | 'normal' {
  if (SDD_STATUSES.has(wfh)) return 'sdd';
  if (OVERWEIGHT_STATUSES.has(wfh)) return 'overweight';
  return 'normal';
}

function pct(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
}

export async function getMonthlyNutritionStats(prisma: PrismaClient): Promise<MonthlyNutritionStat[]> {
  const patients = await prisma.patient.findMany({ select: { examDate: true, wfh: true } });

  const buckets = new Map<string, { total: number; sdd: number; overweight: number; normal: number }>();
  for (const p of patients) {
    const month = p.examDate.toISOString().slice(0, 7); // 'YYYY-MM'
    const bucket = buckets.get(month) ?? { total: 0, sdd: 0, overweight: 0, normal: 0 };
    bucket.total += 1;
    const cls = classify(p.wfh);
    if (cls === 'sdd') bucket.sdd += 1;
    else if (cls === 'overweight') bucket.overweight += 1;
    else bucket.normal += 1;
    buckets.set(month, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      total: b.total,
      sddCount: b.sdd,
      overweightCount: b.overweight,
      normalCount: b.normal,
      sddPct: pct(b.sdd, b.total),
      overweightPct: pct(b.overweight, b.total),
      normalPct: pct(b.normal, b.total),
    }));
}

// Severity distance from "Bình thường" (0) — both malnutrition and
// overweight/obesity move away from 0 in opposite directions, so a shrinking
// |score| means the child moved closer to normal regardless of which side
// they started on (e.g. severe malnutrition improving straight to overweight
// still counts as "closer to normal" by this metric — a known simplification,
// acceptable for a clinic-wide aggregate rather than a per-child diagnosis).
const WFH_SEVERITY: Record<string, number> = {
  'SDD cấp nặng': -2,
  'Suy dinh dưỡng cấp': -1,
  'Bình thường': 0,
  'Thừa cân': 1,
  'Béo phì': 2,
};

function severityOf(wfh: string): number {
  return WFH_SEVERITY[wfh] ?? 0;
}

/**
 * Compares each child's first vs. most recent visit (children with only 1
 * visit are excluded — nothing to compare) to gauge whether the clinic's
 * counseling/follow-up is moving kids toward a normal nutritional status.
 * Per the approved plan: this compares ALL children with 2+ visits, not just
 * those with "Tư vấn dinh dưỡng: Có" recorded — a simpler, always-available
 * metric rather than one that only works once enough post-counseling
 * follow-up visits exist.
 */
export async function getInterventionEffectiveness(prisma: PrismaClient): Promise<InterventionEffectivenessStats> {
  const children = await prisma.child.findMany({
    include: { patients: { orderBy: { examDate: 'asc' }, select: { examDate: true, wfh: true } } },
  });

  let improved = 0;
  let unchanged = 0;
  let worsened = 0;
  const details: InterventionDetail[] = [];

  for (const child of children) {
    if (child.patients.length < 2) continue;
    const first = child.patients[0];
    const last = child.patients[child.patients.length - 1];
    const firstDist = Math.abs(severityOf(first.wfh));
    const lastDist = Math.abs(severityOf(last.wfh));

    let outcome: InterventionOutcome;
    if (lastDist < firstDist) {
      outcome = 'improved';
      improved += 1;
    } else if (lastDist > firstDist) {
      outcome = 'worsened';
      worsened += 1;
    } else {
      outcome = 'unchanged';
      unchanged += 1;
    }

    details.push({
      childId: child.id,
      childName: child.name,
      firstExamDate: first.examDate.toISOString(),
      firstStatus: first.wfh,
      lastExamDate: last.examDate.toISOString(),
      lastStatus: last.wfh,
      outcome,
    });
  }

  const total = improved + unchanged + worsened;
  return {
    totalChildrenWithMultipleVisits: total,
    improved,
    unchanged,
    worsened,
    improvedPct: pct(improved, total),
    unchangedPct: pct(unchanged, total),
    worsenedPct: pct(worsened, total),
    details: details.sort((a, b) => a.childName.localeCompare(b.childName)),
  };
}

export async function getClinicStatsReport(prisma: PrismaClient): Promise<ClinicStatsReport> {
  const [monthly, intervention] = await Promise.all([getMonthlyNutritionStats(prisma), getInterventionEffectiveness(prisma)]);
  return { monthly, intervention };
}
