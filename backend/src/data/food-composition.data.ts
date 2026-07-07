import type { FoodCategory } from '@dinhduong/shared';

// Bootstrap data for the `Food` table (see food.service.ts). Real per-100g (or
// per-100ml for liquids) nutrition figures for the fixed set of ingredient
// categories menu.service.ts's keyword-matching can resolve a dish to.
//
// These rows are seeded into Postgres as `isSystemDefault: true` on first run
// (see ensureSystemDefaultsSeeded in food.service.ts) so a doctor can view/edit
// them — through the same Food CRUD UI as any other food — with menu
// generation picking up the change immediately. They also back the in-memory
// cache food.service.ts bootstraps at module init, so any code that calls
// getFoodComposition() before a database is available (e.g. this project's
// unit tests) still gets correct, real figures instead of a DB round-trip.
//
// Values are standard, widely-published figures for these common Vietnamese
// staples (Bảng thành phần thực phẩm Việt Nam, Viện Dinh Dưỡng, and — for
// non-Vietnam-specific items like cooking oil — universal nutrition figures).
export interface DefaultFoodSeed {
  name: string;
  category: FoodCategory;
  kcalPer100: number;
  carbPer100: number; // g per 100g/100ml
  proteinPer100: number; // g per 100g/100ml
  fatPer100: number; // g per 100g/100ml
}

export const DEFAULT_FOODS: DefaultFoodSeed[] = [
  // carbs (cooked, as served)
  { name: 'cơm tẻ', category: 'Tinh bột', kcalPer100: 130, carbPer100: 28.2, proteinPer100: 2.7, fatPer100: 0.3 },
  { name: 'bún/phở', category: 'Tinh bột', kcalPer100: 109, carbPer100: 25.0, proteinPer100: 1.8, fatPer100: 0.2 },
  { name: 'cháo đặc', category: 'Tinh bột', kcalPer100: 70, carbPer100: 15.0, proteinPer100: 1.5, fatPer100: 0.3 },
  { name: 'xôi/nếp', category: 'Tinh bột', kcalPer100: 180, carbPer100: 37.0, proteinPer100: 3.5, fatPer100: 1.0 },
  { name: 'cơm gạo lứt', category: 'Tinh bột', kcalPer100: 112, carbPer100: 23.5, proteinPer100: 2.6, fatPer100: 0.9 },
  { name: 'bánh mì', category: 'Tinh bột', kcalPer100: 265, carbPer100: 49.0, proteinPer100: 9.0, fatPer100: 3.2 },

  // protein sources (cooked)
  { name: 'thịt gà', category: 'Đạm', kcalPer100: 165, carbPer100: 0, proteinPer100: 23.0, fatPer100: 7.0 },
  { name: 'thịt bò', category: 'Đạm', kcalPer100: 118, carbPer100: 0, proteinPer100: 21.0, fatPer100: 3.5 },
  { name: 'thịt lợn nạc', category: 'Đạm', kcalPer100: 139, carbPer100: 0, proteinPer100: 21.0, fatPer100: 6.0 },
  { name: 'cá/tôm/hải sản', category: 'Đạm', kcalPer100: 100, carbPer100: 0, proteinPer100: 19.0, fatPer100: 2.0 },
  { name: 'đậu phụ', category: 'Đạm', kcalPer100: 76, carbPer100: 2.7, proteinPer100: 8.1, fatPer100: 4.2 },
  // generic fallback when the dish text doesn't name a specific protein — a
  // rough egg/mixed-meat average, same role the old flat 0.2 proDensity played
  { name: 'thịt/cá/trứng', category: 'Đạm', kcalPer100: 143, carbPer100: 0.7, proteinPer100: 15.0, fatPer100: 9.0 },

  // vegetables
  { name: 'rau xanh chín', category: 'Rau củ', kcalPer100: 25, carbPer100: 4.0, proteinPer100: 2.0, fatPer100: 0.3 },
  { name: 'salad rau củ tươi', category: 'Rau củ', kcalPer100: 20, carbPer100: 3.5, proteinPer100: 1.2, fatPer100: 0.2 },

  // fats
  { name: 'dầu/mỡ', category: 'Chất béo', kcalPer100: 884, carbPer100: 0, proteinPer100: 0, fatPer100: 100 },
  {
    name: 'hạt dinh dưỡng (óc chó, macca)',
    category: 'Hạt & đậu',
    kcalPer100: 650,
    carbPer100: 12.0,
    proteinPer100: 14.0,
    fatPer100: 62.0,
  },

  // snack branch (kcal per 100ml for milks, per 100g for fruit)
  { name: 'sữa đặc trị', category: 'Sữa & chế phẩm', kcalPer100: 100, carbPer100: 11.0, proteinPer100: 2.9, fatPer100: 5.4 }, // F100/PediaSure-style, ~1 kcal/ml
  { name: 'sữa tươi/chua', category: 'Sữa & chế phẩm', kcalPer100: 65, carbPer100: 5.0, proteinPer100: 3.3, fatPer100: 3.6 }, // whole milk / yogurt drink
  { name: 'trái cây tươi', category: 'Trái cây', kcalPer100: 50, carbPer100: 13.0, proteinPer100: 0.6, fatPer100: 0.2 }, // average of common fruit
  { name: 'sữa hạt', category: 'Sữa & chế phẩm', kcalPer100: 60, carbPer100: 3.0, proteinPer100: 2.5, fatPer100: 3.5 }, // nut-milk drink
];

export const FALLBACK_FOOD_NAME = 'thịt/cá/trứng';
