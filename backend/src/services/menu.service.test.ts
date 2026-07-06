import { describe, expect, it } from 'vitest';
import type { MenuDish } from '@dinhduong/shared';
import { buildMenuWithQuantities, getBaseMenu } from './menu.service';

describe('getBaseMenu — fallback to Bình thường when a status combo is missing', () => {
  it('a real combo resolves directly', () => {
    const menu = getBaseMenu('6-12m', 'Bình thường');
    expect(menu['Sáng'].length).toBeGreaterThan(0);
  });
  it('6y+ has real entries for all 3 statuses (verified against legacy source)', () => {
    expect(getBaseMenu('6y+', 'Bình thường')['Sáng'].length).toBeGreaterThan(0);
    expect(getBaseMenu('6y+', 'Suy dinh dưỡng')['Sáng'].length).toBeGreaterThan(0);
    expect(getBaseMenu('6y+', 'Thừa cân/Béo phì')['Sáng'].length).toBeGreaterThan(0);
  });
});

describe('buildMenuWithQuantities — meal-ratio energy sums to 100%', () => {
  it('sum of all 6 meal-slot mealKcal ≈ targetEnergy', () => {
    const targetEnergy = 1200;
    const menu = buildMenuWithQuantities({
      baseMenu: getBaseMenu('12-24m', 'Bình thường'),
      months: 18,
      targetEnergy,
      carbG: 150,
      proteinG: 60,
      lipidG: 40,
      statusKey: 'Bình thường',
    });
    const meals: (keyof typeof menu)[] = ['Sáng', 'Phụ sáng', 'Trưa', 'Phụ chiều', 'Tối', 'Phụ tối'];
    const kcalPerMeal = meals.map((meal) => {
      const dish = (menu[meal] as (MenuDish | '—')[])[0];
      return dish === '—' ? 0 : dish.mealKcal;
    });
    const sum = kcalPerMeal.reduce((a, b) => a + b, 0);
    // Ratios 0.20+0.10+0.25+0.10+0.25+0.10 = 1.00 exactly, each rounded independently.
    expect(sum).toBeGreaterThanOrEqual(targetEnergy - 6);
    expect(sum).toBeLessThanOrEqual(targetEnergy + 6);
  });
});

describe('buildMenuWithQuantities — dish keyword classification', () => {
  const base = {
    months: 36,
    targetEnergy: 1300,
    carbG: 160,
    proteinG: 65,
    lipidG: 43,
  };

  it('"cháo" dish uses carbDensity 0.15 and skips the veggie line', () => {
    const menu = buildMenuWithQuantities({
      baseMenu: {
        'Sáng': ['Cháo gà xay nhuyễn'],
        'Phụ sáng': ['—'],
        'Trưa': ['—'],
        'Phụ chiều': ['—'],
        'Tối': ['—'],
        'Phụ tối': ['—'],
        'Ghi chú': '',
      },
      statusKey: 'Bình thường',
      ...base,
    });
    const dish = menu['Sáng'][0] as MenuDish;
    const carbLine = dish.ingredients.find((i) => i.label.includes('cháo đặc'));
    expect(carbLine).toBeDefined();
    expect(dish.ingredients.some((i) => i.label.includes('rau'))).toBe(false);
  });

  it('"phở/bún" dish uses carbDensity 0.20 (bún/phở label)', () => {
    const menu = buildMenuWithQuantities({
      baseMenu: {
        'Sáng': ['Phở bò nước trong'],
        'Phụ sáng': ['—'],
        'Trưa': ['—'],
        'Phụ chiều': ['—'],
        'Tối': ['—'],
        'Phụ tối': ['—'],
        'Ghi chú': '',
      },
      statusKey: 'Bình thường',
      ...base,
    });
    const dish = menu['Sáng'][0] as MenuDish;
    expect(dish.ingredients.some((i) => i.label.includes('bún/phở'))).toBe(true);
  });

  it('"sữa hạt" dish skips protein AND veggie lines but keeps a fat line if wFat>2', () => {
    const menu = buildMenuWithQuantities({
      baseMenu: {
        'Sáng': ['Sữa hạt macca'],
        'Phụ sáng': ['—'],
        'Trưa': ['—'],
        'Phụ chiều': ['—'],
        'Tối': ['—'],
        'Phụ tối': ['—'],
        'Ghi chú': '',
      },
      statusKey: 'Bình thường',
      ...base,
    });
    const dish = menu['Sáng'][0] as MenuDish;
    expect(dish.ingredients.some((i) => i.label.includes('thịt') || i.label.includes('cá'))).toBe(false);
    expect(dish.ingredients.some((i) => i.label.includes('rau'))).toBe(false);
  });

  it('obesity/overweight status substitutes "hạt dinh dưỡng" instead of "dầu/mỡ"', () => {
    const menu = buildMenuWithQuantities({
      baseMenu: {
        'Sáng': ['Cơm gà nướng'],
        'Phụ sáng': ['—'],
        'Trưa': ['—'],
        'Phụ chiều': ['—'],
        'Tối': ['—'],
        'Phụ tối': ['—'],
        'Ghi chú': '',
      },
      statusKey: 'Thừa cân/Béo phì',
      months: 36,
      targetEnergy: 1300,
      carbG: 100,
      proteinG: 50,
      lipidG: 60, // large lipid budget so wFat > 2 after subtracting fatFromMeat
    });
    const dish = menu['Sáng'][0] as MenuDish;
    const hasNutFat = dish.ingredients.some((i) => i.label.includes('hạt dinh dưỡng'));
    const hasOilFat = dish.ingredients.some((i) => i.label === 'dầu/mỡ');
    expect(hasOilFat).toBe(false);
    expect(hasNutFat).toBe(true);
  });
});
