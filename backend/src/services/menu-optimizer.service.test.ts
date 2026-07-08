import type { FoodCategory } from '@dinhduong/shared';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_FOODS } from '../data/food-composition.data';
import { loadCompositionCache, type FoodCacheEntry } from './food.service';
import { foodMatchesFilters, generateOptimizedMenu, nutritionPurity, scoreCandidates, weightedPick } from './menu-optimizer.service';

function food(overrides: Partial<FoodCacheEntry> & { name: string; category: FoodCategory }): FoodCacheEntry {
  return {
    kcalPer100: 100,
    carbPer100: 0,
    proteinPer100: 0,
    fatPer100: 0,
    costPer100: null,
    preferenceScore: 3,
    ...overrides,
  };
}

afterEach(() => {
  loadCompositionCache(DEFAULT_FOODS); // restore bootstrap defaults so other test files aren't affected
});

describe('foodMatchesFilters', () => {
  const seafood = food({ name: 'Tôm hấp', category: 'Đạm' });
  const pork = food({ name: 'Thịt lợn nạc', category: 'Đạm' });
  const beef = food({ name: 'Thịt bò', category: 'Đạm' });
  const egg = food({ name: 'Trứng luộc', category: 'Đạm' });
  const tofu = food({ name: 'Đậu phụ', category: 'Đạm' });
  const chicken = food({ name: 'Thịt gà', category: 'Đạm' });
  const milk = food({ name: 'Sữa tươi', category: 'Sữa & chế phẩm' });
  const nuts = food({ name: 'Hạt óc chó', category: 'Hạt & đậu' });
  const rice = food({ name: 'Cơm tẻ', category: 'Tinh bột' });

  it('no filters → everything passes', () => {
    expect(foodMatchesFilters(seafood, {})).toBe(true);
    expect(foodMatchesFilters(milk, {})).toBe(true);
  });

  it('noSeafood excludes only seafood-named Đạm foods', () => {
    expect(foodMatchesFilters(seafood, { noSeafood: true })).toBe(false);
    expect(foodMatchesFilters(chicken, { noSeafood: true })).toBe(true);
  });

  it('noPork excludes pork (incl. processed-meat words), noBeef excludes beef', () => {
    expect(foodMatchesFilters(pork, { noPork: true })).toBe(false);
    expect(foodMatchesFilters(beef, { noBeef: true })).toBe(false);
    expect(foodMatchesFilters(beef, { noPork: true })).toBe(true);
  });

  it('noEgg excludes egg', () => {
    expect(foodMatchesFilters(egg, { noEgg: true })).toBe(false);
  });

  it('vegetarian keeps only plant-based Đạm foods (đậu phụ), excludes meat/fish', () => {
    expect(foodMatchesFilters(tofu, { vegetarian: true })).toBe(true);
    expect(foodMatchesFilters(chicken, { vegetarian: true })).toBe(false);
    expect(foodMatchesFilters(seafood, { vegetarian: true })).toBe(false);
  });

  it('noDairy excludes the whole Sữa & chế phẩm category', () => {
    expect(foodMatchesFilters(milk, { noDairy: true })).toBe(false);
  });

  it('noPeanutNuts excludes the whole Hạt & đậu category', () => {
    expect(foodMatchesFilters(nuts, { noPeanutNuts: true })).toBe(false);
  });

  it('filters never apply to non-Đạm categories other than their own explicit category rule', () => {
    expect(foodMatchesFilters(rice, { vegetarian: true, noSeafood: true, noPork: true, noBeef: true, noEgg: true })).toBe(true);
  });
});

describe('nutritionPurity', () => {
  it('a food whose calories are entirely from the primary macro scores 1', () => {
    const pureCarb = food({ name: 'X', category: 'Tinh bột', kcalPer100: 80, carbPer100: 20 }); // 20g*4kcal = 80kcal = 100%
    expect(nutritionPurity(pureCarb, pureCarb.carbPer100, 4)).toBe(1);
  });

  it('a food where the primary macro is a small share of calories scores low', () => {
    const mostlyFat = food({ name: 'Y', category: 'Đạm', kcalPer100: 200, proteinPer100: 5 }); // 5*4=20kcal of 200 = 0.1
    expect(nutritionPurity(mostlyFat, mostlyFat.proteinPer100, 4)).toBeCloseTo(0.1, 5);
  });

  it('caps at 1 even if computed share would exceed 100% (rounding safety)', () => {
    const f = food({ name: 'Z', category: 'Tinh bột', kcalPer100: 50, carbPer100: 20 }); // 80kcal > 50kcal
    expect(nutritionPurity(f, f.carbPer100, 4)).toBe(1);
  });
});

describe('scoreCandidates', () => {
  it('cost is neutral (0.5 contribution) for every candidate when none has a price', () => {
    const pool = [food({ name: 'A', category: 'Tinh bột' }), food({ name: 'B', category: 'Tinh bột' })];
    const scored = scoreCandidates(pool, () => 1); // nutrition maxed, so score = (1 + 0.5 + preference/5) / 3
    for (const c of scored) {
      expect(c.score).toBeCloseTo((1 + 0.5 + c.food.preferenceScore / 5) / 3, 5);
    }
  });

  it('a cheaper food scores higher than a pricier one, all else equal', () => {
    const cheap = food({ name: 'Cheap', category: 'Tinh bột', costPer100: 5000 });
    const pricey = food({ name: 'Pricey', category: 'Tinh bột', costPer100: 50000 });
    const scored = scoreCandidates([cheap, pricey], () => 0.5);
    const cheapScore = scored.find((c) => c.food.name === 'Cheap')!.score;
    const priceyScore = scored.find((c) => c.food.name === 'Pricey')!.score;
    expect(cheapScore).toBeGreaterThan(priceyScore);
  });

  it('a higher preferenceScore scores higher, all else equal', () => {
    const liked = food({ name: 'Liked', category: 'Tinh bột', preferenceScore: 5 });
    const disliked = food({ name: 'Disliked', category: 'Tinh bột', preferenceScore: 1 });
    const scored = scoreCandidates([liked, disliked], () => 0.5);
    expect(scored.find((c) => c.food.name === 'Liked')!.score).toBeGreaterThan(scored.find((c) => c.food.name === 'Disliked')!.score);
  });
});

describe('weightedPick', () => {
  it('random() → 0 always picks the first candidate in the array', () => {
    const candidates = [
      { food: food({ name: 'First', category: 'Tinh bột' }), score: 0.3 },
      { food: food({ name: 'Second', category: 'Tinh bột' }), score: 0.9 },
    ];
    expect(weightedPick(candidates, () => 0).name).toBe('First');
  });

  it('random() → just under 1 picks the last candidate', () => {
    const candidates = [
      { food: food({ name: 'First', category: 'Tinh bột' }), score: 0.5 },
      { food: food({ name: 'Second', category: 'Tinh bột' }), score: 0.5 },
    ];
    expect(weightedPick(candidates, () => 0.999999).name).toBe('Second');
  });

  it('excludes the given name when ≥2 candidates exist', () => {
    const candidates = [
      { food: food({ name: 'First', category: 'Tinh bột' }), score: 0.5 },
      { food: food({ name: 'Second', category: 'Tinh bột' }), score: 0.5 },
    ];
    expect(weightedPick(candidates, () => 0, 'First').name).toBe('Second');
  });

  it('falls back to the full pool if excluding would leave nothing (single-candidate pool)', () => {
    const candidates = [{ food: food({ name: 'Only', category: 'Tinh bột' }), score: 0.5 }];
    expect(weightedPick(candidates, () => 0, 'Only').name).toBe('Only');
  });
});

describe('generateOptimizedMenu', () => {
  const smallPool: FoodCacheEntry[] = [
    food({ name: 'cơm tẻ', category: 'Tinh bột', kcalPer100: 130, carbPer100: 28.2, proteinPer100: 2.7, fatPer100: 0.3 }),
    food({ name: 'cháo đặc', category: 'Tinh bột', kcalPer100: 70, carbPer100: 15.0, proteinPer100: 1.5, fatPer100: 0.3 }),
    food({ name: 'thịt gà', category: 'Đạm', kcalPer100: 165, proteinPer100: 23.0, fatPer100: 7.0 }),
    food({ name: 'tôm', category: 'Đạm', kcalPer100: 100, proteinPer100: 19.0, fatPer100: 2.0 }),
    food({ name: 'rau xanh chín', category: 'Rau củ', kcalPer100: 25, carbPer100: 4, proteinPer100: 2, fatPer100: 0.3 }),
    food({ name: 'dầu/mỡ', category: 'Chất béo', kcalPer100: 884, fatPer100: 100 }),
    food({ name: 'hạt dinh dưỡng', category: 'Hạt & đậu', kcalPer100: 650, fatPer100: 60, proteinPer100: 15 }),
    food({ name: 'sữa tươi/chua', category: 'Sữa & chế phẩm', kcalPer100: 60, carbPer100: 5, proteinPer100: 3, fatPer100: 3 }),
    food({ name: 'trái cây tươi', category: 'Trái cây', kcalPer100: 50, carbPer100: 12 }),
  ];

  beforeEach(() => {
    loadCompositionCache(smallPool);
  });

  const baseParams = { months: 30, targetEnergy: 1200, carbG: 150, proteinG: 60, lipidG: 40, statusKey: 'Bình thường' };

  it('produces all 6 meal slots, each with 7 variants, and a note', () => {
    const menu = generateOptimizedMenu(baseParams);
    expect(Object.keys(menu).sort()).toEqual(['Phụ chiều', 'Phụ sáng', 'Phụ tối', 'Sáng', 'Trưa', 'Tối', 'note'].sort());
    expect(menu['Sáng']).toHaveLength(7);
    expect(typeof menu.note).toBe('string');
  });

  it('each main-meal dish totals mealKcal = round(targetEnergy * slot ratio)', () => {
    const menu = generateOptimizedMenu(baseParams);
    const dish = menu['Trưa'][0];
    expect(dish).not.toBe('—');
    if (dish !== '—') expect(dish.mealKcal).toBe(Math.round(1200 * 0.25));
  });

  it('a carb food named with "cháo" skips the separate rau line (congee already contains it)', () => {
    // Force the carb pick to always be "cháo đặc" (weightedPick random=0 picks array-first;
    // "cơm tẻ" is first in smallPool, so exclude it by removing it from the cache for this case).
    loadCompositionCache(smallPool.filter((f) => f.name !== 'cơm tẻ'));
    const menu = generateOptimizedMenu({ ...baseParams, random: () => 0 });
    const dish = menu['Sáng'][0];
    expect(dish).not.toBe('—');
    if (dish !== '—') {
      expect(dish.ingredients.some((i) => i.label.includes('cháo'))).toBe(true);
      expect(dish.ingredients.some((i) => i.label.includes('rau'))).toBe(false);
    }
  });

  it('overweight/obese status substitutes nuts for oil in the fat line', () => {
    const menu = generateOptimizedMenu({ ...baseParams, statusKey: 'Thừa cân/Béo phì', carbG: 84, proteinG: 84, lipidG: 32 });
    const dish = menu['Trưa'][0];
    expect(dish).not.toBe('—');
    if (dish !== '—') {
      const fatLine = dish.ingredients.find((i) => i.label.includes('dầu') || i.label.includes('hạt'));
      if (fatLine) expect(fatLine.label).toContain('hạt');
    }
  });

  it('allergy filter excludes seafood from every generated protein line', () => {
    const menu = generateOptimizedMenu({ ...baseParams, filters: { noSeafood: true } });
    for (const dish of menu['Trưa']) {
      if (dish === '—') continue;
      expect(dish.ingredients.some((i) => i.label.includes('tôm'))).toBe(false);
    }
  });

  it('empty carb pool → main-meal slots become "—" instead of throwing', () => {
    loadCompositionCache(smallPool.filter((f) => f.category !== 'Tinh bột'));
    const menu = generateOptimizedMenu(baseParams);
    expect(menu['Trưa'].every((d) => d === '—')).toBe(true);
  });

  it('snack slots pick from Sữa & chế phẩm / Trái cây and size to mealKcal', () => {
    const menu = generateOptimizedMenu(baseParams);
    const snack = menu['Phụ sáng'][0];
    expect(snack).not.toBe('—');
    if (snack !== '—') {
      expect(['sữa tươi/chua', 'trái cây tươi']).toContain(snack.dishName);
      expect(snack.mealKcal).toBe(Math.round(1200 * 0.1));
    }
  });
});
