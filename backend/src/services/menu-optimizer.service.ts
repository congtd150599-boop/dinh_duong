import type { FoodCategory, MealSlot, MenuDish, MenuFilters, MenuIngredient, WeeklyMenu } from '@dinhduong/shared';
import { getFoodsCache, type FoodCacheEntry } from './food.service';

const MEAL_SLOTS: MealSlot[] = ['Sáng', 'Phụ sáng', 'Trưa', 'Phụ chiều', 'Tối', 'Phụ tối'];

/** Meal-energy split ratios — unchanged from the old fixed-menu system (menu.service.ts), still the correct % split regardless of how each slot's dish is chosen. */
const MEAL_RATIOS: Record<MealSlot, number> = {
  'Sáng': 0.2,
  'Phụ sáng': 0.1,
  'Trưa': 0.25,
  'Phụ chiều': 0.1,
  'Tối': 0.25,
  'Phụ tối': 0.1,
};

const VARIANTS_PER_SLOT = 7;

const CATEGORY_ICON: Record<FoodCategory, string> = {
  'Tinh bột': '🍚',
  'Đạm': '🥩',
  'Rau củ': '🥗',
  'Trái cây': '🍎',
  'Sữa & chế phẩm': '🥛',
  'Chất béo': '🫒',
  'Hạt & đậu': '🥜',
  'Khác': '🍽️',
};

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

// --- Allergy/religion filtering, scoped to Food.name within a category pool
// (a few dozen rows at most) instead of 84 free-text dish-name strings — same
// keyword patterns as the old menu-filter.service.ts (now retired), just a
// much smaller, more maintainable surface since only the 'Đạm' category can
// ever carry these tags.
function proteinFoodTags(name: string) {
  const s = name.toLowerCase();
  return {
    hasSeafood: /tôm|cua|cá|mực|nghêu|sò|ốc|hải sản|ngao/.test(s),
    hasEgg: /trứng/.test(s),
    hasPork: /heo|lợn|sườn|chả|nem|giò|pate|pat[êe]|xúc xích/.test(s),
    hasBeef: /bò|bê|sốt vang/.test(s),
    isPlantBased: /đậu phụ|đậu hũ|chay/.test(s),
  };
}

/** Exported for direct unit testing — see menu-optimizer.service.test.ts. */
export function foodMatchesFilters(food: FoodCacheEntry, filters: MenuFilters): boolean {
  if (food.category === 'Sữa & chế phẩm' && filters.noDairy) return false;
  if (food.category === 'Hạt & đậu' && filters.noPeanutNuts) return false;
  if (food.category === 'Đạm') {
    const tags = proteinFoodTags(food.name);
    if (filters.noSeafood && tags.hasSeafood) return false;
    if (filters.noEgg && tags.hasEgg) return false;
    if (filters.noPork && tags.hasPork) return false;
    if (filters.noBeef && tags.hasBeef) return false;
    if (filters.vegetarian && !tags.isPlantBased) return false;
  }
  return true;
}

/**
 * "How cleanly does this food serve the role it's being picked for" — e.g. a
 * carb source that's mostly carbohydrate calories (ít đạm/béo đi kèm) is a
 * "purer" choice than one that also carries a lot of protein/fat, since
 * whatever grams get chosen to hit the target macro, the co-occurring
 * macros ride along whether wanted or not. Normalized 0-1 across the
 * candidate pool (min-max), not an absolute clinical score — a simplified
 * stand-in for "nutrition fit" alongside cost/preference, not a substitute
 * for a dietitian's judgment.
 */
/** Exported for direct unit testing — see menu-optimizer.service.test.ts. */
export function nutritionPurity(food: FoodCacheEntry, primaryMacroPer100: number, kcalPerGram: 4 | 9): number {
  if (food.kcalPer100 <= 0) return 0.5;
  const kcalFromPrimary = primaryMacroPer100 * kcalPerGram;
  return Math.min(1, kcalFromPrimary / food.kcalPer100);
}

export interface ScoredCandidate {
  food: FoodCacheEntry;
  score: number;
}

/** Equal-weight nutrition/cost/preference scoring (per user's explicit choice) — cost is neutral (0.5) for every candidate when none in the pool has a price yet, so it never distorts ranking before real prices are entered. Exported for direct unit testing. */
export function scoreCandidates(pool: FoodCacheEntry[], nutritionScoreOf: (f: FoodCacheEntry) => number): ScoredCandidate[] {
  const costs = pool.map((f) => f.costPer100).filter((c): c is number => c != null);
  const costMin = costs.length > 0 ? Math.min(...costs) : null;
  const costMax = costs.length > 0 ? Math.max(...costs) : null;

  return pool.map((food) => {
    const nutritionScore = nutritionScoreOf(food);
    const costScore = food.costPer100 == null || costMin === null || costMax === null || costMin === costMax ? 0.5 : 1 - (food.costPer100 - costMin) / (costMax - costMin);
    const preferenceScore = food.preferenceScore / 5;
    return { food, score: (nutritionScore + costScore + preferenceScore) / 3 };
  });
}

/** Weighted-random pick (not always-the-top-scorer) so the 7 variants for a slot aren't identical every day; `exclude` softly discourages immediately repeating the previous day's pick when there's another reasonable option. Exported for direct unit testing. */
export function weightedPick(candidates: ScoredCandidate[], random: () => number, exclude?: string): FoodCacheEntry {
  const pool = candidates.length > 1 && exclude ? candidates.filter((c) => c.food.name !== exclude) : candidates;
  const usable = pool.length > 0 ? pool : candidates;
  const weights = usable.map((c) => Math.max(c.score, 0.02));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = random() * total;
  for (let i = 0; i < usable.length; i++) {
    r -= weights[i];
    if (r <= 0) return usable[i].food;
  }
  return usable[usable.length - 1].food;
}

export interface OptimizeMenuParams {
  months: number;
  targetEnergy: number;
  carbG: number;
  proteinG: number;
  lipidG: number;
  statusKey: string;
  filters?: MenuFilters;
  /** Injectable for deterministic tests — defaults to Math.random. */
  random?: () => number;
}

function vegGramForAge(months: number): number {
  return months < 24 ? 50 : months < 72 ? 80 : 120;
}

function buildMainDish(args: {
  mCarbG: number;
  mProG: number;
  mLipidG: number;
  mealKcal: number;
  months: number;
  statusKey: string;
  carbPool: FoodCacheEntry[];
  proteinPool: FoodCacheEntry[];
  vegPool: FoodCacheEntry[];
  fatPool: FoodCacheEntry[];
  nutPool: FoodCacheEntry[];
  random: () => number;
  lastCarb?: string;
  lastProtein?: string;
}): { dish: MenuDish; carbName: string; proteinName: string } {
  const { mCarbG, mProG, mLipidG, mealKcal, months, statusKey, carbPool, proteinPool, vegPool, fatPool, nutPool, random, lastCarb, lastProtein } = args;
  const ingredients: MenuIngredient[] = [];

  const carbScored = scoreCandidates(carbPool, (f) => nutritionPurity(f, f.carbPer100, 4));
  const carbFood = weightedPick(carbScored, random, lastCarb);
  const wCarb = roundToStep((mCarbG / carbFood.carbPer100) * 100, 5);
  ingredients.push({ icon: CATEGORY_ICON['Tinh bột'], amount: wCarb, unit: 'g', label: `${carbFood.name} chín` });

  const proteinScored = scoreCandidates(proteinPool, (f) => nutritionPurity(f, f.proteinPer100, 4));
  const proteinFood = weightedPick(proteinScored, random, lastProtein);
  const wPro = roundToStep((mProG / proteinFood.proteinPer100) * 100, 5);
  ingredients.push({ icon: CATEGORY_ICON['Đạm'], amount: wPro, unit: 'g', label: `${proteinFood.name} chín` });

  // Congee-style carb bases already carry their mixed-in ingredients — same
  // "skip a separate veg line" rule as the old fixed-menu system.
  const isCongee = carbFood.name.toLowerCase().includes('cháo');
  if (!isCongee && vegPool.length > 0) {
    const vegScored = scoreCandidates(vegPool, () => 0.5); // no meaningful macro-purity axis for vegetables in this model
    const vegFood = weightedPick(vegScored, random);
    const wVeg = vegGramForAge(months);
    ingredients.push({ icon: CATEGORY_ICON['Rau củ'], amount: wVeg, unit: 'g', label: `${vegFood.name} chín` });
  }

  // Fat naturally present in the weighed protein portion, then a
  // status-dependent multiplier — identical clinical intent to the old
  // system (richer prep advised for malnourished children, leaner for
  // overweight/obese ones).
  let fatMultiplier = 1;
  if (statusKey.includes('Béo phì') || statusKey.includes('Thừa cân')) fatMultiplier = 0.4;
  else if (statusKey.includes('Suy dinh')) fatMultiplier = 1.6;
  const fatFromMeat = wPro * (proteinFood.fatPer100 / 100) * fatMultiplier;
  const addedFat = Math.max(0, mLipidG - fatFromMeat);
  const wFat = Math.round(addedFat);

  if (wFat > 2) {
    const isOverweight = statusKey.includes('Béo phì') || statusKey.includes('Thừa cân');
    const pool = isOverweight && nutPool.length > 0 ? nutPool : fatPool;
    if (pool.length > 0) {
      const fatScored = scoreCandidates(pool, (f) => nutritionPurity(f, f.fatPer100, 9));
      const fatFood = weightedPick(fatScored, random);
      const grams = roundToStep((wFat / fatFood.fatPer100) * 100, 1);
      const unit = fatFood.category === 'Chất béo' ? 'ml' : 'g';
      ingredients.push({ icon: CATEGORY_ICON[fatFood.category], amount: grams, unit, label: fatFood.name });
    }
  }

  return { dish: { dishName: `${carbFood.name} + ${proteinFood.name}`, mealKcal, ingredients }, carbName: carbFood.name, proteinName: proteinFood.name };
}

function buildSnackDish(args: { mealKcal: number; snackPool: FoodCacheEntry[]; random: () => number; lastSnack?: string }): { dish: MenuDish; snackName: string } | null {
  const { mealKcal, snackPool, random, lastSnack } = args;
  if (snackPool.length === 0) return null;

  const scored = scoreCandidates(snackPool, (f) => nutritionPurity(f, f.proteinPer100 + f.carbPer100, 4));
  const food = weightedPick(scored, random, lastSnack);
  const unit = food.category === 'Sữa & chế phẩm' ? 'ml' : 'g';
  const amount = roundToStep((mealKcal / food.kcalPer100) * 100, 10);
  const icon = CATEGORY_ICON[food.category];

  return { dish: { dishName: food.name, mealKcal, ingredients: [{ icon, amount, unit, label: food.name }] }, snackName: food.name };
}

/**
 * Replaces the old fixed 7-dish-per-slot sample menu (menu.data.ts, retired)
 * with a candidate pool drawn live from the `Food` table, scored equally on
 * nutrition fit / cost / preference (per the approved design), picked via
 * weighted-random so the week doesn't repeat the same dish every day. Energy
 * split per slot, macro-per-slot budgeting, veg grams by age, and the
 * status-dependent fat handling are all unchanged from the old system —
 * only *which food fills a role* is now dynamic instead of hardcoded.
 */
export function generateOptimizedMenu(params: OptimizeMenuParams): WeeklyMenu {
  const { months, targetEnergy, carbG, proteinG, lipidG, statusKey, filters = {}, random = Math.random } = params;

  const allFoods = getFoodsCache().filter((f) => foodMatchesFilters(f, filters));
  const byCategory = (cat: FoodCategory) => allFoods.filter((f) => f.category === cat);

  const carbPool = byCategory('Tinh bột');
  const proteinPool = byCategory('Đạm');
  const vegPool = byCategory('Rau củ');
  const fatPool = byCategory('Chất béo');
  const nutPool = byCategory('Hạt & đậu');
  const snackPool = [...byCategory('Sữa & chế phẩm'), ...byCategory('Trái cây')];

  const result = {} as WeeklyMenu;

  for (const meal of MEAL_SLOTS) {
    const ratio = MEAL_RATIOS[meal];
    const mealKcal = Math.round(targetEnergy * ratio);
    const mCarbG = carbG * ratio;
    const mProG = proteinG * ratio;
    const mLipidG = lipidG * ratio;
    const isSnackSlot = meal.includes('Phụ');

    const dishes: (MenuDish | '—')[] = [];
    let lastCarb: string | undefined;
    let lastProtein: string | undefined;
    let lastSnack: string | undefined;

    for (let i = 0; i < VARIANTS_PER_SLOT; i++) {
      if (isSnackSlot) {
        const built = buildSnackDish({ mealKcal, snackPool, random, lastSnack });
        dishes.push(built ? built.dish : '—');
        lastSnack = built?.snackName;
      } else {
        if (carbPool.length === 0 || proteinPool.length === 0) {
          dishes.push('—');
          continue;
        }
        const built = buildMainDish({
          mCarbG,
          mProG,
          mLipidG,
          mealKcal,
          months,
          statusKey,
          carbPool,
          proteinPool,
          vegPool,
          fatPool,
          nutPool,
          random,
          lastCarb,
          lastProtein,
        });
        dishes.push(built.dish);
        lastCarb = built.carbName;
        lastProtein = built.proteinName;
      }
    }
    result[meal] = dishes;
  }

  result.note =
    'Thực đơn được hệ thống tự động chọn từ danh sách thực phẩm hiện có, cân đối dinh dưỡng/chi phí/mức độ phổ biến. Điều chỉnh theo sở thích, dị ứng và điều kiện gia đình. Tham khảo thêm chuyên gia dinh dưỡng.';
  return result;
}
