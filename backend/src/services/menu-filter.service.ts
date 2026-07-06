import type { MealSlot, MenuFilters } from '@dinhduong/shared';
import type { MenuEntry } from '../data/menu.data';

const MEAL_SLOTS: MealSlot[] = ['Sáng', 'Phụ sáng', 'Trưa', 'Phụ chiều', 'Tối', 'Phụ tối'];

/** Compliant with every possible filter combination — the fallback when a meal slot's whole 7-dish pool fails a filter. */
const SAFE_FALLBACK_DISH = 'Cơm trắng + đậu phụ luộc + rau củ luộc';

export interface DishTags {
  hasSeafood: boolean;
  hasEgg: boolean;
  hasDairy: boolean;
  hasPeanutNuts: boolean;
  hasMeatOrFish: boolean; // for the vegetarian filter
  hasPork: boolean;
  hasBeef: boolean;
}

/** Keyword-based tagging — same text-classification style already used in menu.service.ts, not a hand-curated per-dish table. */
export function deriveMenuTags(dishName: string): DishTags {
  const s = dishName.toLowerCase();
  const isChayDish = s.includes('chay') || s.includes('đậu phụ') || s.includes('đậu hũ');

  const hasSeafood = /tôm|cua|cá|mực|nghêu|sò|ốc|hải sản|ngao/.test(s);
  const hasEgg = /trứng/.test(s);
  const hasDairy = /sữa|váng sữa|phô mai|bơ/.test(s);
  const hasPeanutNuts = /đậu phộng|lạc|hạt điều|hạnh nhân|óc chó|macca|hạt dinh dưỡng/.test(s);
  // "chả"/"nem"/"giò"/"pate"/"xúc xích" are Vietnamese dish-naming conventions for
  // processed/ground meat (almost always pork unless paired with a seafood word,
  // which hasSeafood already catches separately) — not literal "heo"/"lợn", but
  // still meat. Missing these let "Bún chả", "Nem rán", "Bánh mì ... pate" etc.
  // slip through the vegetarian/no-pork filters undetected.
  const hasProcessedPorkWord = /chả|nem|giò|pate|pat[êe]|xúc xích/.test(s);
  const hasPork = /heo|lợn|sườn/.test(s) || hasProcessedPorkWord;
  const hasBeef = /bò|bê|sốt vang/.test(s); // "bê" = veal; "sốt vang" = a beef-stew sauce, names the dish without saying "bò"
  // "lươn" (eel) and "ếch" (frog) are real animal protein but not a proper
  // seafood-allergy match, so they count toward hasMeatOrFish only, not hasSeafood.
  const hasAnyMeatKeyword = hasSeafood || hasPork || hasBeef || /gà|vịt|thịt|chim|ếch|lươn/.test(s);

  return {
    hasSeafood,
    hasEgg,
    hasDairy,
    hasPeanutNuts,
    hasMeatOrFish: !isChayDish && hasAnyMeatKeyword,
    hasPork,
    hasBeef,
  };
}

export function dishMatchesFilters(dishName: string, filters: MenuFilters): boolean {
  if (dishName === '—' || !dishName) return true;
  const tags = deriveMenuTags(dishName);
  if (filters.noSeafood && tags.hasSeafood) return false;
  if (filters.noEgg && tags.hasEgg) return false;
  if (filters.noDairy && tags.hasDairy) return false;
  if (filters.noPeanutNuts && tags.hasPeanutNuts) return false;
  if (filters.vegetarian && tags.hasMeatOrFish) return false;
  if (filters.noPork && tags.hasPork) return false;
  if (filters.noBeef && tags.hasBeef) return false;
  return true;
}

/**
 * Substitutes any dish that fails the active filters with a compliant dish
 * from the SAME meal slot's 7-day candidate pool (cycling through whichever
 * ones qualify, for some variety across the week) — or the hardcoded neutral
 * fallback if the entire pool fails. Runs on the raw dish-name menu, before
 * buildMenuWithQuantities turns it into ingredient/quantity data.
 */
export function applyMenuFilters(baseMenu: MenuEntry, filters: MenuFilters): MenuEntry {
  const hasActiveFilter = Object.values(filters).some(Boolean);
  if (!hasActiveFilter) return baseMenu;

  const result = { ...baseMenu };
  for (const meal of MEAL_SLOTS) {
    const pool = baseMenu[meal];
    const compliant = pool.filter((d) => dishMatchesFilters(d, filters));
    result[meal] = pool.map((dish, i) => {
      if (dishMatchesFilters(dish, filters)) return dish;
      return compliant.length > 0 ? compliant[i % compliant.length] : SAFE_FALLBACK_DISH;
    });
  }
  return result;
}
