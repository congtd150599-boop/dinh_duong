import { describe, expect, it } from 'vitest';
import { DEFAULT_FOODS, FALLBACK_FOOD_NAME } from '../data/food-composition.data';
import { getFoodComposition } from './food.service';

describe('getFoodComposition — bootstrapped from DEFAULT_FOODS with zero DB dependency', () => {
  it('resolves a known canonical name to its real figures', () => {
    const comp = getFoodComposition('thịt gà');
    expect(comp.kcalPer100).toBe(165);
    expect(comp.proteinPer100).toBe(23.0);
  });

  it('unknown label falls back to the generic protein average, same as the old static table', () => {
    const fallback = DEFAULT_FOODS.find((f) => f.name === FALLBACK_FOOD_NAME)!;
    const comp = getFoodComposition('món ăn không tồn tại trong bảng');
    expect(comp.kcalPer100).toBe(fallback.kcalPer100);
    expect(comp.proteinPer100).toBe(fallback.proteinPer100);
  });

  it('every DEFAULT_FOODS entry resolves to itself exactly (bootstrap cache is complete)', () => {
    for (const f of DEFAULT_FOODS) {
      const comp = getFoodComposition(f.name);
      expect(comp).toEqual({
        kcalPer100: f.kcalPer100,
        carbPer100: f.carbPer100,
        proteinPer100: f.proteinPer100,
        fatPer100: f.fatPer100,
      });
    }
  });
});
