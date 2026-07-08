import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { testPrisma, truncateAllTables } from '../test-utils/test-prisma';
import { getClinicStatsReport, getInterventionEffectiveness, getMonthlyNutritionStats } from './clinic-stats.service';

beforeAll(async () => {
  await truncateAllTables();
});

afterEach(async () => {
  await truncateAllTables();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

const basePatient = {
  name: 'Test Patient',
  dob: new Date('2024-01-01'),
  gender: 'Nam',
  weight: 10,
  height: 80,
  tuvan: 'Có',
  months: 24,
  bmi: 15.6,
  wfa: 'Bình thường',
  hfa: 'Bình thường',
  stdEnergy: 1000,
  targetEnergy: 1000,
  carbG: 100,
  proteinG: 30,
  lipidG: 30,
  labAssessmentSummary: 'Bình thường',
  fullResult: {},
};

async function createChild(name: string): Promise<string> {
  const child = await testPrisma.child.create({ data: { name, dob: new Date('2024-01-01'), gender: 'Nam' } });
  return child.id;
}

function createVisit(childId: string, examDate: string, wfh: string, name = 'Test Patient') {
  return testPrisma.patient.create({ data: { ...basePatient, name, examDate: new Date(examDate), wfh, childId } });
}

describe('getMonthlyNutritionStats', () => {
  it('buckets patients by YYYY-MM of examDate and computes counts', async () => {
    const c1 = await createChild('A');
    const c2 = await createChild('B');
    const c3 = await createChild('C');
    await createVisit(c1, '2026-01-05', 'Bình thường');
    await createVisit(c2, '2026-01-20', 'SDD cấp nặng');
    await createVisit(c3, '2026-02-10', 'Thừa cân');

    const stats = await getMonthlyNutritionStats(testPrisma);

    expect(stats).toEqual([
      { month: '2026-01', total: 2, sddCount: 1, overweightCount: 0, normalCount: 1, sddPct: 50, overweightPct: 0, normalPct: 50 },
      { month: '2026-02', total: 1, sddCount: 0, overweightCount: 1, normalCount: 0, sddPct: 0, overweightPct: 100, normalPct: 0 },
    ]);
  });

  it('classifies both SDD severities and both overweight severities the same way', async () => {
    const c1 = await createChild('A');
    const c2 = await createChild('B');
    const c3 = await createChild('C');
    const c4 = await createChild('D');
    await createVisit(c1, '2026-03-01', 'SDD cấp nặng');
    await createVisit(c2, '2026-03-02', 'Suy dinh dưỡng cấp');
    await createVisit(c3, '2026-03-03', 'Thừa cân');
    await createVisit(c4, '2026-03-04', 'Béo phì');

    const [stat] = await getMonthlyNutritionStats(testPrisma);

    expect(stat).toMatchObject({ total: 4, sddCount: 2, overweightCount: 2, normalCount: 0 });
  });

  it('no patients → empty array', async () => {
    expect(await getMonthlyNutritionStats(testPrisma)).toEqual([]);
  });
});

describe('getInterventionEffectiveness', () => {
  it('child with only 1 visit is excluded entirely', async () => {
    const c = await createChild('OnlyOneVisit');
    await createVisit(c, '2026-01-01', 'SDD cấp nặng');

    const result = await getInterventionEffectiveness(testPrisma);

    expect(result.totalChildrenWithMultipleVisits).toBe(0);
    expect(result.details).toHaveLength(0);
  });

  it('SDD → Bình thường counts as improved', async () => {
    const c = await createChild('Improver');
    await createVisit(c, '2026-01-01', 'SDD cấp nặng', 'Improver');
    await createVisit(c, '2026-04-01', 'Bình thường', 'Improver');

    const result = await getInterventionEffectiveness(testPrisma);

    expect(result.improved).toBe(1);
    expect(result.unchanged).toBe(0);
    expect(result.worsened).toBe(0);
    expect(result.details[0]).toMatchObject({ childName: 'Improver', firstStatus: 'SDD cấp nặng', lastStatus: 'Bình thường', outcome: 'improved' });
  });

  it('Bình thường → Béo phì counts as worsened', async () => {
    const c = await createChild('Worsener');
    await createVisit(c, '2026-01-01', 'Bình thường', 'Worsener');
    await createVisit(c, '2026-04-01', 'Béo phì', 'Worsener');

    const result = await getInterventionEffectiveness(testPrisma);

    expect(result.worsened).toBe(1);
    expect(result.details[0].outcome).toBe('worsened');
  });

  it('same status both visits counts as unchanged', async () => {
    const c = await createChild('Stable');
    await createVisit(c, '2026-01-01', 'Bình thường', 'Stable');
    await createVisit(c, '2026-04-01', 'Bình thường', 'Stable');

    const result = await getInterventionEffectiveness(testPrisma);

    expect(result.unchanged).toBe(1);
    expect(result.details[0].outcome).toBe('unchanged');
  });

  it('uses the FIRST and LAST visit, ignoring any in between', async () => {
    const c = await createChild('ThreeVisits');
    await createVisit(c, '2026-01-01', 'SDD cấp nặng', 'ThreeVisits');
    await createVisit(c, '2026-02-01', 'Béo phì', 'ThreeVisits'); // middle visit — should be ignored
    await createVisit(c, '2026-03-01', 'Bình thường', 'ThreeVisits');

    const result = await getInterventionEffectiveness(testPrisma);

    expect(result.details[0]).toMatchObject({ firstStatus: 'SDD cấp nặng', lastStatus: 'Bình thường', outcome: 'improved' });
  });

  it('aggregates percentages across multiple children and sorts details by name', async () => {
    const c1 = await createChild('Zed');
    const c2 = await createChild('Anna');
    await createVisit(c1, '2026-01-01', 'SDD cấp nặng', 'Zed');
    await createVisit(c1, '2026-04-01', 'Bình thường', 'Zed');
    await createVisit(c2, '2026-01-01', 'Bình thường', 'Anna');
    await createVisit(c2, '2026-04-01', 'Bình thường', 'Anna');

    const result = await getInterventionEffectiveness(testPrisma);

    expect(result.totalChildrenWithMultipleVisits).toBe(2);
    expect(result.improvedPct).toBe(50);
    expect(result.unchangedPct).toBe(50);
    expect(result.details.map((d) => d.childName)).toEqual(['Anna', 'Zed']);
  });
});

describe('getClinicStatsReport', () => {
  it('combines both monthly and intervention data in one call', async () => {
    const c = await createChild('Combined');
    await createVisit(c, '2026-01-01', 'SDD cấp nặng', 'Combined');
    await createVisit(c, '2026-02-01', 'Bình thường', 'Combined');

    const report = await getClinicStatsReport(testPrisma);

    expect(report.monthly).toHaveLength(2);
    expect(report.intervention.totalChildrenWithMultipleVisits).toBe(1);
  });
});
