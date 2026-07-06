import { describe, expect, it } from 'vitest';
import type { MenuEntry } from '../data/menu.data';
import { applyMenuFilters, deriveMenuTags, dishMatchesFilters } from './menu-filter.service';

describe('deriveMenuTags', () => {
  it('tags seafood, egg, dairy, nuts, pork, beef independently', () => {
    expect(deriveMenuTags('Cháo tôm bí đỏ').hasSeafood).toBe(true);
    expect(deriveMenuTags('Cháo trứng ta cà chua').hasEgg).toBe(true);
    expect(deriveMenuTags('Sữa chua trẻ em').hasDairy).toBe(true);
    expect(deriveMenuTags('Sữa hạt óc chó').hasPeanutNuts).toBe(true);
    expect(deriveMenuTags('Cơm + Sườn xào chua ngọt').hasPork).toBe(true);
    expect(deriveMenuTags('Cơm + Bò lúc lắc').hasBeef).toBe(true);
  });

  it('a "chay" or đậu phụ dish is never tagged as containing meat/fish, even if it names a meat-like word', () => {
    expect(deriveMenuTags('Bánh bao chay').hasMeatOrFish).toBe(false);
    expect(deriveMenuTags('Đậu phụ sốt cà chua').hasMeatOrFish).toBe(false);
  });

  it('an ordinary meat/fish dish is tagged as containing meat/fish', () => {
    expect(deriveMenuTags('Gà nướng thảo mộc').hasMeatOrFish).toBe(true);
    expect(deriveMenuTags('Cá hồi áp chảo').hasMeatOrFish).toBe(true);
  });

  it('Vietnamese dish-naming conventions for meat without the literal animal word are still caught (found via real menu-data audit)', () => {
    expect(deriveMenuTags('Cháo lươn đồng cà rốt').hasMeatOrFish).toBe(true); // lươn = eel
    expect(deriveMenuTags('Cơm + Bê thui xào sả ớt').hasBeef).toBe(true); // bê = veal
    expect(deriveMenuTags('Bún chả Hà Nội').hasPork).toBe(true); // chả = ground/grilled pork
    expect(deriveMenuTags('Xôi gấc chả giò').hasPork).toBe(true); // chả giò = fried pork spring rolls
    expect(deriveMenuTags('Bánh mì trứng pate').hasPork).toBe(true); // pate = pork liver pâté
    expect(deriveMenuTags('Bánh mì sốt vang').hasBeef).toBe(true); // sốt vang = a beef-stew sauce
  });

  it('a plain vegetable/rice dish with no meat keyword at all is not tagged as meat', () => {
    expect(deriveMenuTags('Cơm trắng + rau củ luộc').hasMeatOrFish).toBe(false);
  });
});

describe('dishMatchesFilters', () => {
  it('"—" (empty slot) always matches, regardless of filters', () => {
    expect(dishMatchesFilters('—', { vegetarian: true, noSeafood: true })).toBe(true);
  });

  it('no filters active → everything matches', () => {
    expect(dishMatchesFilters('Cháo tôm bí đỏ', {})).toBe(true);
  });

  it('noSeafood excludes a seafood dish but not others', () => {
    expect(dishMatchesFilters('Cháo tôm bí đỏ', { noSeafood: true })).toBe(false);
    expect(dishMatchesFilters('Cháo gà xay nhuyễn', { noSeafood: true })).toBe(true);
  });

  it('vegetarian excludes any meat/fish dish but allows chay/đậu phụ dishes', () => {
    expect(dishMatchesFilters('Cơm + Gà nướng thảo mộc', { vegetarian: true })).toBe(false);
    expect(dishMatchesFilters('Đậu phụ sốt cà chua', { vegetarian: true })).toBe(true);
  });
});

describe('applyMenuFilters', () => {
  const baseMenu: MenuEntry = {
    'Sáng': ['Cháo tôm bí đỏ', 'Cháo gà xay nhuyễn', 'Cháo lợn băm rau ngót', 'Cháo trứng ta cà chua', 'Cháo bò khoai tây', 'Cháo cá chép cải bó xôi', 'Cháo chim câu hạt sen'],
    'Phụ sáng': ['—', '—', '—', '—', '—', '—', '—'],
    'Trưa': ['—', '—', '—', '—', '—', '—', '—'],
    'Phụ chiều': ['—', '—', '—', '—', '—', '—', '—'],
    'Tối': ['—', '—', '—', '—', '—', '—', '—'],
    'Phụ tối': ['—', '—', '—', '—', '—', '—', '—'],
    'Ghi chú': '',
  };

  it('no active filter → returns the exact same menu unchanged', () => {
    expect(applyMenuFilters(baseMenu, {})).toBe(baseMenu);
  });

  it('noSeafood substitutes only the seafood day, from a compliant day in the same slot', () => {
    const filtered = applyMenuFilters(baseMenu, { noSeafood: true });
    expect(filtered['Sáng'][0]).not.toBe('Cháo tôm bí đỏ'); // day 1 (tôm) got substituted
    expect(filtered['Sáng'][5]).not.toBe('Cháo cá chép cải bó xôi'); // day 6 (cá) also seafood
    expect(deriveMenuTags(filtered['Sáng'][0]).hasSeafood).toBe(false);
    expect(filtered['Sáng'][1]).toBe('Cháo gà xay nhuyễn'); // untouched, already compliant
  });

  it('when every dish in the pool fails the filter, falls back to the safe neutral dish', () => {
    const allMeat: MenuEntry = {
      ...baseMenu,
      'Sáng': ['Cháo gà', 'Cháo bò', 'Cháo lợn', 'Cháo gà', 'Cháo bò', 'Cháo lợn', 'Cháo gà'],
    };
    const filtered = applyMenuFilters(allMeat, { vegetarian: true });
    for (const dish of filtered['Sáng']) {
      expect(dishMatchesFilters(dish, { vegetarian: true })).toBe(true);
    }
  });
});
