// Real per-100g (or per-100ml for liquids) nutrition figures for the fixed set
// of ingredient categories menu.service.ts's keyword-matching can resolve a
// dish to — replaces the previous invented density constants (carbDensity =
// 0.28, proDensity = 0.2, fatFromMeat = wPro * 0.05, etc.) with sourced data,
// while keeping the same "back-solve a display weight from the day's already-
// computed macro budget" arithmetic (menu suggestions stay illustrative
// servings hitting clinically-determined targets — see energy.service.ts,
// which is unaffected by this file).
//
// Values are standard, widely-published figures for these common Vietnamese
// staples (Bảng thành phần thực phẩm Việt Nam, Viện Dinh Dưỡng, and — for
// non-Vietnam-specific items like cooking oil — universal nutrition figures).
// This is a small, bounded table (the ingredient categories this app's fixed
// menus can ever resolve to), not a general food database.
export interface FoodComposition {
  kcalPer100: number;
  carbPer100: number; // g per 100g/100ml
  proteinPer100: number; // g per 100g/100ml
  fatPer100: number; // g per 100g/100ml
}

export const FOOD_COMPOSITION: Record<string, FoodComposition> = {
  // carbs (cooked, as served)
  'cơm tẻ': { kcalPer100: 130, carbPer100: 28.2, proteinPer100: 2.7, fatPer100: 0.3 },
  'bún/phở': { kcalPer100: 109, carbPer100: 25.0, proteinPer100: 1.8, fatPer100: 0.2 },
  'cháo đặc': { kcalPer100: 70, carbPer100: 15.0, proteinPer100: 1.5, fatPer100: 0.3 },
  'xôi/nếp': { kcalPer100: 180, carbPer100: 37.0, proteinPer100: 3.5, fatPer100: 1.0 },
  'cơm gạo lứt': { kcalPer100: 112, carbPer100: 23.5, proteinPer100: 2.6, fatPer100: 0.9 },
  'bánh mì': { kcalPer100: 265, carbPer100: 49.0, proteinPer100: 9.0, fatPer100: 3.2 },

  // protein sources (cooked)
  'thịt gà': { kcalPer100: 165, carbPer100: 0, proteinPer100: 23.0, fatPer100: 7.0 },
  'thịt bò': { kcalPer100: 118, carbPer100: 0, proteinPer100: 21.0, fatPer100: 3.5 },
  'thịt lợn nạc': { kcalPer100: 139, carbPer100: 0, proteinPer100: 21.0, fatPer100: 6.0 },
  'cá/tôm/hải sản': { kcalPer100: 100, carbPer100: 0, proteinPer100: 19.0, fatPer100: 2.0 },
  'đậu phụ': { kcalPer100: 76, carbPer100: 2.7, proteinPer100: 8.1, fatPer100: 4.2 },
  // generic fallback when the dish text doesn't name a specific protein — a
  // rough egg/mixed-meat average, same role the old flat 0.2 proDensity played
  'thịt/cá/trứng': { kcalPer100: 143, carbPer100: 0.7, proteinPer100: 15.0, fatPer100: 9.0 },

  // vegetables
  'rau xanh chín': { kcalPer100: 25, carbPer100: 4.0, proteinPer100: 2.0, fatPer100: 0.3 },
  'salad rau củ tươi': { kcalPer100: 20, carbPer100: 3.5, proteinPer100: 1.2, fatPer100: 0.2 },

  // fats
  'dầu/mỡ': { kcalPer100: 884, carbPer100: 0, proteinPer100: 0, fatPer100: 100 },
  'hạt dinh dưỡng (óc chó, macca)': { kcalPer100: 650, carbPer100: 12.0, proteinPer100: 14.0, fatPer100: 62.0 },

  // snack branch (kcal per 100ml for milks, per 100g for fruit)
  'sữa đặc trị': { kcalPer100: 100, carbPer100: 11.0, proteinPer100: 2.9, fatPer100: 5.4 }, // F100/PediaSure-style, ~1 kcal/ml
  'sữa tươi/chua': { kcalPer100: 65, carbPer100: 5.0, proteinPer100: 3.3, fatPer100: 3.6 }, // whole milk / yogurt drink
  'trái cây tươi': { kcalPer100: 50, carbPer100: 13.0, proteinPer100: 0.6, fatPer100: 0.2 }, // average of common fruit
  'sữa hạt': { kcalPer100: 60, carbPer100: 3.0, proteinPer100: 2.5, fatPer100: 3.5 }, // nut-milk drink
};

export function getFoodComposition(label: string): FoodComposition {
  return FOOD_COMPOSITION[label] ?? FOOD_COMPOSITION['thịt/cá/trứng'];
}
