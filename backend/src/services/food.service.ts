import type { Food, PrismaClient } from '@prisma/client';
import type { FoodCategory, FoodConditionTag, FoodRecord } from '@dinhduong/shared';
import { DEFAULT_FOODS, FALLBACK_FOOD_NAME } from '../data/food-composition.data';

export class FoodServiceError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

/** The shape menu.service.ts's dish-quantity math needs — a narrower view of a Food row. */
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
    benefits: food.benefits,
    cautionNote: food.cautionNote,
    conditionTags: food.conditionTags as FoodConditionTag[],
    source: food.source,
    isSystemDefault: food.isSystemDefault,
  };
}

// In-memory cache for getFoodComposition() — called synchronously, many times
// per menu build, so it must never round-trip to the DB. Bootstrapped from
// DEFAULT_FOODS at module init (so callers with zero DB access, like this
// project's unit tests, still get correct figures with no DB dependency),
// then refreshed from Postgres at server startup and after every
// create/update/delete so a doctor's edit affects the next generated menu
// immediately — same "no restart needed" property as growth-standards.service.ts.
let cache = new Map<string, FoodComposition>();

/** Exported only so integration tests can restore the bootstrap defaults after mutating the cache via the DB — see foods.integration.test.ts. */
export function loadCompositionCache(foods: Array<FoodComposition & { name: string }>): void {
  const next = new Map<string, FoodComposition>();
  for (const f of foods) {
    next.set(f.name, { kcalPer100: f.kcalPer100, carbPer100: f.carbPer100, proteinPer100: f.proteinPer100, fatPer100: f.fatPer100 });
  }
  cache = next;
}

loadCompositionCache(DEFAULT_FOODS);

/** Looks up nutrition-per-100(g|ml) by exact food name, falling back to a generic average — same fallback behavior as the old static food-composition.data.ts. */
export function getFoodComposition(label: string): FoodComposition {
  return cache.get(label) ?? cache.get(FALLBACK_FOOD_NAME)!;
}

/** Loads the cache from the database. Returns the number of rows loaded (0 = DB empty, bundled default stays active). */
export async function loadFromDatabase(prisma: PrismaClient): Promise<number> {
  const rows = await prisma.food.findMany();
  if (rows.length === 0) return 0;
  loadCompositionCache(rows);
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
