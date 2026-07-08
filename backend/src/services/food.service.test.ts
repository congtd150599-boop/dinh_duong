import { describe, expect, it } from 'vitest';
import { DEFAULT_FOODS } from '../data/food-composition.data';
import { getFoodsCache } from './food.service';

describe('getFoodsCache — bootstrapped from DEFAULT_FOODS with zero DB dependency', () => {
  it('every DEFAULT_FOODS entry is present with matching figures', () => {
    const cache = getFoodsCache();
    for (const f of DEFAULT_FOODS) {
      const entry = cache.find((c) => c.name === f.name);
      expect(entry).toBeDefined();
      expect(entry).toMatchObject({
        category: f.category,
        kcalPer100: f.kcalPer100,
        carbPer100: f.carbPer100,
        proteinPer100: f.proteinPer100,
        fatPer100: f.fatPer100,
      });
    }
  });

  it('unrated bootstrap entries default to costPer100=null, preferenceScore=3', () => {
    const cache = getFoodsCache();
    for (const entry of cache) {
      expect(entry.costPer100).toBeNull();
      expect(entry.preferenceScore).toBe(3);
    }
  });

  it('cache size matches DEFAULT_FOODS count', () => {
    expect(getFoodsCache()).toHaveLength(DEFAULT_FOODS.length);
  });
});
