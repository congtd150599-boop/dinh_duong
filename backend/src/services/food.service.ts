import type { Food, PrismaClient } from '@prisma/client';
import type { FoodCategory, FoodConditionTag, FoodRecord } from '@dinhduong/shared';
import { DEFAULT_FOODS } from '../data/food-composition.data';

export class FoodServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

/** The narrow nutrition-per-100(g|ml) shape menu-optimizer.service.ts's dish-quantity math needs. */
export interface FoodComposition {
  kcalPer100: number;
  carbPer100: number;
  proteinPer100: number;
  fatPer100: number;
}

function toRecord(food: Food): FoodRecord {
  return {
    id: food.id,
    createdAt: food.createdAt.toISOString(),
    updatedAt: food.updatedAt.toISOString(),
    name: food.name,
    category: food.category as FoodCategory,
    kcalPer100: food.kcalPer100,
    proteinPer100: food.proteinPer100,
    carbPer100: food.carbPer100,
    fatPer100: food.fatPer100,
    costPer100: food.costPer100,
    preferenceScore: food.preferenceScore,
    benefits: food.benefits,
    cautionNote: food.cautionNote,
    conditionTags: food.conditionTags as FoodConditionTag[],
    source: food.source,
    isSystemDefault: food.isSystemDefault,
  };
}

/** Full shape menu-optimizer.service.ts needs to pick/score candidates — a superset of FoodComposition. */
export interface FoodCacheEntry extends FoodComposition {
  name: string;
  category: FoodCategory;
  costPer100: number | null;
  preferenceScore: number;
}

// In-memory cache for getFoodsCache() — called synchronously, many times
// per menu build (runAssessment is a pure,
// DB-free function — see assessment.service.ts), so it must never round-trip
// to the DB. Bootstrapped from DEFAULT_FOODS at module init (so callers with
// zero DB access, like this project's unit tests, still get correct figures
// with no DB dependency), then refreshed from Postgres at server startup and
// after every create/update/delete so a doctor's edit affects the next
// generated menu immediately — same "no restart needed" property as
// growth-standards.service.ts.
let cache = new Map<string, FoodCacheEntry>();

/** Exported only so integration tests can restore the bootstrap defaults after mutating the cache via the DB — see foods.integration.test.ts. */
export function loadCompositionCache(foods: Array<FoodComposition & { name: string; category: FoodCategory; costPer100?: number | null; preferenceScore?: number }>): void {
  const next = new Map<string, FoodCacheEntry>();
  for (const f of foods) {
    next.set(f.name, {
      name: f.name,
      category: f.category,
      kcalPer100: f.kcalPer100,
      carbPer100: f.carbPer100,
      proteinPer100: f.proteinPer100,
      fatPer100: f.fatPer100,
      costPer100: f.costPer100 ?? null,
      preferenceScore: f.preferenceScore ?? 3,
    });
  }
  cache = next;
}

loadCompositionCache(DEFAULT_FOODS);

/** All cached foods, for menu-optimizer.service.ts to filter/score by category. */
export function getFoodsCache(): FoodCacheEntry[] {
  return [...cache.values()];
}

/** Loads the cache from the database. Returns the number of rows loaded (0 = DB empty, bundled default stays active). */
export async function loadFromDatabase(prisma: PrismaClient): Promise<number> {
  const rows = await prisma.food.findMany();
  if (rows.length === 0) return 0;
  loadCompositionCache(rows.map((r) => ({ ...r, category: r.category as FoodCategory })));
  return rows.length;
}

/**
 * Idempotently inserts the ~20 core menu-generation foods as isSystemDefault
 * rows. `update: {}` means an existing row (including one a doctor has since
 * edited) is left untouched — this only fills in rows that are missing.
 */
export async function ensureSystemDefaultsSeeded(prisma: PrismaClient): Promise<void> {
  for (const f of DEFAULT_FOODS) {
    await prisma.food.upsert({
      where: { name: f.name },
      update: {},
      create: {
        name: f.name,
        category: f.category,
        kcalPer100: f.kcalPer100,
        proteinPer100: f.proteinPer100,
        carbPer100: f.carbPer100,
        fatPer100: f.fatPer100,
        isSystemDefault: true,
      },
    });
  }
}

export async function listFoods(prisma: PrismaClient): Promise<FoodRecord[]> {
  const foods = await prisma.food.findMany({ orderBy: { name: 'asc' } });
  return foods.map(toRecord);
}

export async function getFood(prisma: PrismaClient, id: string): Promise<FoodRecord | null> {
  const food = await prisma.food.findUnique({ where: { id } });
  return food ? toRecord(food) : null;
}

export interface CreateFoodInput {
  name: string;
  category: FoodCategory;
  kcalPer100: number;
  proteinPer100?: number;
  carbPer100?: number;
  fatPer100?: number;
  costPer100?: number | null;
  preferenceScore?: number;
  benefits?: string | null;
  cautionNote?: string | null;
  conditionTags?: FoodConditionTag[];
  source?: string | null;
}

export async function createFood(prisma: PrismaClient, input: CreateFoodInput): Promise<FoodRecord> {
  const name = input.name.trim();
  const existing = await prisma.food.findUnique({ where: { name } });
  if (existing) throw new FoodServiceError('Tên thực phẩm này đã tồn tại', 409);

  const food = await prisma.food.create({
    data: {
      name,
      category: input.category,
      kcalPer100: input.kcalPer100,
      proteinPer100: input.proteinPer100 ?? 0,
      carbPer100: input.carbPer100 ?? 0,
      fatPer100: input.fatPer100 ?? 0,
      costPer100: input.costPer100 ?? null,
      preferenceScore: input.preferenceScore ?? 3,
      benefits: input.benefits ?? null,
      cautionNote: input.cautionNote ?? null,
      conditionTags: input.conditionTags ?? [],
      source: input.source ?? null,
    },
  });
  await loadFromDatabase(prisma);
  return toRecord(food);
}

export interface UpdateFoodInput {
  name?: string;
  category?: FoodCategory;
  kcalPer100?: number;
  proteinPer100?: number;
  carbPer100?: number;
  fatPer100?: number;
  costPer100?: number | null;
  preferenceScore?: number;
  benefits?: string | null;
  cautionNote?: string | null;
  conditionTags?: FoodConditionTag[];
  source?: string | null;
}

export async function updateFood(prisma: PrismaClient, id: string, input: UpdateFoodInput): Promise<FoodRecord> {
  const target = await prisma.food.findUnique({ where: { id } });
  if (!target) throw new FoodServiceError('Không tìm thấy thực phẩm', 404);

  if (input.name !== undefined && input.name.trim() !== target.name) {
    const dup = await prisma.food.findUnique({ where: { name: input.name.trim() } });
    if (dup) throw new FoodServiceError('Tên thực phẩm này đã tồn tại', 409);
  }

  const food = await prisma.food.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.kcalPer100 !== undefined ? { kcalPer100: input.kcalPer100 } : {}),
      ...(input.proteinPer100 !== undefined ? { proteinPer100: input.proteinPer100 } : {}),
      ...(input.carbPer100 !== undefined ? { carbPer100: input.carbPer100 } : {}),
      ...(input.fatPer100 !== undefined ? { fatPer100: input.fatPer100 } : {}),
      ...(input.costPer100 !== undefined ? { costPer100: input.costPer100 } : {}),
      ...(input.preferenceScore !== undefined ? { preferenceScore: input.preferenceScore } : {}),
      ...(input.benefits !== undefined ? { benefits: input.benefits } : {}),
      ...(input.cautionNote !== undefined ? { cautionNote: input.cautionNote } : {}),
      ...(input.conditionTags !== undefined ? { conditionTags: input.conditionTags } : {}),
      ...(input.source !== undefined ? { source: input.source } : {}),
    },
  });
  await loadFromDatabase(prisma);
  return toRecord(food);
}

/** Returns the deleted food (for the caller to build an audit-log summary from), or null if no such food existed. */
export async function deleteFood(prisma: PrismaClient, id: string) {
  const target = await prisma.food.findUnique({ where: { id } });
  if (!target) return null;
  if (target.isSystemDefault) {
    throw new FoodServiceError('Không thể xoá thực phẩm hệ thống dùng để sinh thực đơn tuần — chỉ có thể chỉnh sửa', 400);
  }
  await prisma.food.delete({ where: { id } });
  await loadFromDatabase(prisma);
  return target;
}
