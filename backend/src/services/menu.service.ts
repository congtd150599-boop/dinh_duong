import type { MealSlot, MenuDish, MenuIngredient, WeeklyMenu } from '@dinhduong/shared';
import { MENU_DATA, type AgeKey, type MenuEntry } from '../data/menu.data';
import { getFoodComposition } from './food.service';

const MEAL_SLOTS: MealSlot[] = ['Sáng', 'Phụ sáng', 'Trưa', 'Phụ chiều', 'Tối', 'Phụ tối'];

/** Meal-energy split ratios — verbatim from legacy/index.html line 2240. */
const MEAL_RATIOS: Record<MealSlot, number> = {
  'Sáng': 0.2,
  'Phụ sáng': 0.1,
  'Trưa': 0.25,
  'Phụ chiều': 0.1,
  'Tối': 0.25,
  'Phụ tối': 0.1,
};

/** A dish containing one of these has a real staple carb, however else it reads — never snack-classified by text alone. */
const STAPLE_KEYWORDS = ['cơm', 'cháo', 'bún', 'phở', 'mì', 'xôi', 'bánh mì'];

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Verbatim port of the menu lookup + fallback from legacy calculate() (line 2236):
 *   MENU_DATA[menuKey] || MENU_DATA[`${ageKey}_Bình thường`] || {}
 */
export function getBaseMenu(ageKey: AgeKey, statusKey: string): MenuEntry {
  const menuKey = `${ageKey}_${statusKey}`;
  return (
    MENU_DATA[menuKey] ??
    MENU_DATA[`${ageKey}_Bình thường`] ?? {
      'Sáng': [],
      'Phụ sáng': [],
      'Trưa': [],
      'Phụ chiều': [],
      'Tối': [],
      'Phụ tối': [],
      'Ghi chú': '',
    }
  );
}

/**
 * Port of the "Dynamic Macro-based Menu Processing" block in legacy
 * calculate() (lines 2239-2330), returning structured ingredient data instead
 * of pre-baked HTML strings. Ingredient weights are back-solved from the
 * day's already-computed macro budget using real per-ingredient nutrition
 * data (food-composition.data.ts) — energy.service.ts's targets stay entirely
 * independent of dish/ingredient content, same architecture as before.
 */
export function buildMenuWithQuantities(params: {
  baseMenu: MenuEntry;
  months: number;
  targetEnergy: number;
  carbG: number;
  proteinG: number;
  lipidG: number;
  statusKey: string;
}): WeeklyMenu {
  const { baseMenu, months, targetEnergy, carbG, proteinG, lipidG, statusKey } = params;

  const result = {} as WeeklyMenu;

  for (const meal of MEAL_SLOTS) {
    const ratio = MEAL_RATIOS[meal];
    const mealKcal = Math.round(targetEnergy * ratio);
    const mCarbG = carbG * ratio;
    const mProG = proteinG * ratio;
    const mLipidG = lipidG * ratio;

    result[meal] = baseMenu[meal].map((dish): MenuDish | '—' => {
      if (dish === '—' || !dish) return '—';
      const lowDish = dish.toLowerCase();
      const ingredients: MenuIngredient[] = [];

      const hasStaple = STAPLE_KEYWORDS.some((kw) => lowDish.includes(kw));
      // A dish only reads as a pure drink/fruit snack if it has no staple carb
      // at all — fixes a bug where a full meal mentioning "sữa" as a side
      // (e.g. "Khoai lang luộc + Sữa tách béo") was wrongly rendered as a
      // single milk line instead of the actual meal.
      const isSnack =
        meal.includes('Phụ') ||
        (!hasStaple && (lowDish.includes('sữa') || lowDish.includes('trái cây') || lowDish.includes('hoa quả')));

      if (isSnack) {
        if (lowDish.includes('sữa f100') || lowDish.includes('sữa cao') || lowDish.includes('pedia')) {
          const comp = getFoodComposition('sữa đặc trị');
          const ml = roundToStep((mealKcal / comp.kcalPer100) * 100, 10);
          ingredients.push({ icon: '🥛', amount: ml, unit: 'ml', label: 'sữa đặc trị' });
        } else if (lowDish.includes('sữa hạt')) {
          const comp = getFoodComposition('sữa hạt');
          const ml = roundToStep((mealKcal / comp.kcalPer100) * 100, 10);
          ingredients.push({ icon: '🌰', amount: ml, unit: 'ml', label: 'sữa hạt' });
        } else if (lowDish.includes('sữa')) {
          const milkComp = getFoodComposition('sữa tươi/chua');
          const ml = roundToStep((mealKcal / milkComp.kcalPer100) * 100, 10);
          if (ml > 250) {
            const fruitComp = getFoodComposition('trái cây tươi');
            const milkKcal = 200 * (milkComp.kcalPer100 / 100);
            ingredients.push({ icon: '🥛', amount: 200, unit: 'ml', label: 'sữa' });
            ingredients.push({
              icon: '🍎',
              amount: roundToStep(((mealKcal - milkKcal) / fruitComp.kcalPer100) * 100, 5),
              unit: 'g',
              label: 'trái cây/bánh',
            });
          } else {
            ingredients.push({ icon: '🥛', amount: ml, unit: 'ml', label: 'sữa tươi/chua' });
          }
        } else {
          const comp = getFoodComposition('trái cây tươi');
          const g = roundToStep((mealKcal / comp.kcalPer100) * 100, 10);
          ingredients.push({ icon: '🍎', amount: g, unit: 'g', label: 'trái cây tươi' });
        }
      } else {
        // Main meals
        let carbLabel = 'cơm tẻ';
        let carbIcon = '🍚';

        // "bánh mì" checked before the "mì" (bún/phở/mì) keyword, which would
        // otherwise always match first ('bánh mì'.includes('mì') is true) and
        // permanently shadow this branch.
        if (lowDish.includes('bánh mì')) {
          carbLabel = 'bánh mì';
          carbIcon = '🥖';
        } else if (lowDish.includes('phở') || lowDish.includes('bún') || lowDish.includes('mì')) {
          carbLabel = 'bún/phở';
          carbIcon = '🍜';
        } else if (lowDish.includes('cháo')) {
          carbLabel = 'cháo đặc';
          carbIcon = '🍲';
        } else if (lowDish.includes('xôi')) {
          carbLabel = 'xôi/nếp';
          carbIcon = '🍙';
        } else if (lowDish.includes('cơm lứt')) {
          carbLabel = 'cơm gạo lứt';
        }

        const carbComp = getFoodComposition(carbLabel);
        const wCarb = roundToStep((mCarbG / carbComp.carbPer100) * 100, 5);
        ingredients.push({ icon: carbIcon, amount: wCarb, unit: 'g', label: `${carbLabel} chín` });

        let proLabel = 'thịt/cá/trứng';
        if (lowDish.includes('gà')) proLabel = 'thịt gà';
        else if (lowDish.includes('bò')) proLabel = 'thịt bò';
        else if (lowDish.includes('cá') || lowDish.includes('tôm') || lowDish.includes('mực') || lowDish.includes('cua'))
          proLabel = 'cá/tôm/hải sản';
        else if (lowDish.includes('đậu phụ') || lowDish.includes('chay')) proLabel = 'đậu phụ';
        else if (lowDish.includes('lợn') || lowDish.includes('heo') || lowDish.includes('sườn') || lowDish.includes('thịt băm'))
          proLabel = 'thịt lợn nạc';

        const isGrilled = lowDish.includes('nướng') || lowDish.includes('áp chảo');
        const proComp = getFoodComposition(proLabel);
        const wPro = roundToStep((mProG / proComp.proteinPer100) * 100, 5);
        const proDisplayLabel = isGrilled ? `${proLabel} (nướng/áp chảo ít dầu)` : proLabel;
        ingredients.push({ icon: '🥩', amount: wPro, unit: 'g', label: `${proDisplayLabel} chín` });

        const isCongee = lowDish.includes('cháo');
        if (!isCongee) {
          let wVeg = months < 24 ? 50 : months < 72 ? 80 : 120;
          let vegLabel = 'rau xanh chín';
          if (lowDish.includes('salad')) {
            vegLabel = 'salad rau củ tươi';
            wVeg = wVeg * 1.5;
          }
          ingredients.push({ icon: '🥗', amount: Math.round(wVeg), unit: 'g', label: vegLabel });
        }

        // Fat naturally present in the weighed protein portion, using that
        // ingredient's real fat-per-100g — then a status/preparation
        // multiplier for the same clinical intent as before (leaner
        // preparation advised for overweight children, richer for
        // malnourished ones, less oil retained when grilled).
        let fatMultiplier = 1;
        if (statusKey.includes('Béo phì')) fatMultiplier = 0.4;
        else if (statusKey.includes('Suy dinh')) fatMultiplier = 1.6;
        if (isGrilled) fatMultiplier = 0.4;
        const fatFromMeat = wPro * (proComp.fatPer100 / 100) * fatMultiplier;

        const addedFat = Math.max(0, mLipidG - fatFromMeat);
        const wFat = Math.round(addedFat);

        if (wFat > 2) {
          if (statusKey.includes('Béo phì') || statusKey.includes('Thừa cân')) {
            const nutComp = getFoodComposition('hạt dinh dưỡng (óc chó, macca)');
            const oilComp = getFoodComposition('dầu/mỡ');
            // same fat-gram target, expressed as the lower-fat-density nut mix instead of pure oil
            const nutGrams = Math.round((wFat * oilComp.fatPer100) / nutComp.fatPer100);
            ingredients.push({ icon: '🥜', amount: nutGrams, unit: 'g', label: 'hạt dinh dưỡng (óc chó, macca) thay dầu' });
          } else {
            ingredients.push({ icon: '🫒', amount: wFat, unit: 'ml', label: 'dầu/mỡ' });
          }
        }
      }

      return { dishName: dish, mealKcal, ingredients };
    });
  }

  result.note = baseMenu['Ghi chú'];
  return result;
}
