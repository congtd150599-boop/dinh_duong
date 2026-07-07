import type { Child, PrismaClient } from '@prisma/client';
import { computeGrowthAlerts, type AssessmentResult, type ChildRecord, type Gender, type GrowthAlert, type VisitPoint } from '@dinhduong/shared';

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface FindOrCreateChildInput {
  name: string;
  dob: string; // ISO date
  gender: Gender;
}

/** Reuses an existing Child if one matches on normalized name + exact dob, else creates a new one. */
export async function findOrCreateChild(prisma: PrismaClient, input: FindOrCreateChildInput): Promise<Child> {
  const dob = new Date(input.dob);
  const normalized = normalizeName(input.name);

  const candidates = await prisma.child.findMany({ where: { dob } });
  const existing = candidates.find((c) => normalizeName(c.name) === normalized);
  if (existing) return existing;

  return prisma.child.create({ data: { name: input.name.trim(), dob, gender: input.gender } });
}

const SEARCH_MIN_LENGTH = 2;
const SEARCH_LIMIT = 20;

function toChildRecord(child: Child, lastExamDate: Date | null): ChildRecord {
  return {
    id: child.id,
    name: child.name,
    dob: child.dob.toISOString(),
    gender: child.gender as Gender,
    lastExamDate: lastExamDate ? lastExamDate.toISOString() : null,
  };
}

/** Typeahead search for InputTab's "existing child" picker — startsWith matches ranked before contains, capped at 20. */
export async function searchChildren(prisma: PrismaClient, query: string): Promise<ChildRecord[]> {
  const q = query.trim();
  if (q.length < SEARCH_MIN_LENGTH) return [];

  const startsWith = await prisma.child.findMany({
    where: { name: { startsWith: q, mode: 'insensitive' } },
    take: SEARCH_LIMIT,
    orderBy: { name: 'asc' },
  });

  let contains: Child[] = [];
  if (startsWith.length < SEARCH_LIMIT) {
    contains = await prisma.child.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        id: { notIn: startsWith.map((c) => c.id) },
      },
      take: SEARCH_LIMIT - startsWith.length,
      orderBy: { name: 'asc' },
    });
  }

  const children = [...startsWith, ...contains];
  if (children.length === 0) return [];

  const lastVisits = await prisma.patient.groupBy({
    by: ['childId'],
    where: { childId: { in: children.map((c) => c.id) } },
    _max: { examDate: true },
  });
  const lastVisitByChildId = new Map(lastVisits.map((v) => [v.childId, v._max.examDate]));

  return children.map((c) => toChildRecord(c, lastVisitByChildId.get(c.id) ?? null));
}

export interface ChildHistoryVisit {
  id: string;
  examDate: string;
  weight: number;
  height: number;
  bmi: number;
  wfaZ: number | null;
}

export interface ChildHistory {
  child: ChildRecord;
  visits: ChildHistoryVisit[];
  /** Keyed by visit id — plain object, not a Map, so it survives JSON.stringify over HTTP. */
  alerts: Record<string, GrowthAlert[]>;
}

export async function getChildHistory(prisma: PrismaClient, childId: string): Promise<ChildHistory | null> {
  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) return null;

  const patients = await prisma.patient.findMany({ where: { childId }, orderBy: { examDate: 'asc' } });

  const visits: ChildHistoryVisit[] = patients.map((p) => {
    const fullResult = p.fullResult as unknown as AssessmentResult;
    return {
      id: p.id,
      examDate: p.examDate.toISOString(),
      weight: p.weight,
      height: p.height,
      bmi: p.bmi,
      wfaZ: fullResult.wfaZ,
    };
  });

  const visitPoints: VisitPoint[] = visits.map((v) => ({ id: v.id, examDate: v.examDate, weight: v.weight, height: v.height, wfaZ: v.wfaZ }));
  const alerts = Object.fromEntries(computeGrowthAlerts(visitPoints));

  const lastExamDate = visits.length > 0 ? new Date(visits[visits.length - 1].examDate) : null;

  return { child: toChildRecord(child, lastExamDate), visits, alerts };
}
