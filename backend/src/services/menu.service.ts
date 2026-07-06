import type { MealSlot, MenuDish, MenuIngredient, WeeklyMenu } from '@dinhduong/shared';
import { MENU_DATA, type AgeKey, type MenuEntry } from '../data/menu.data';

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
 * Verbatim port of the "Dynamic Macro-based Menu Processing" block in legacy
 * calculate() (lines 2239-2330). Same quantities/branches, but returns
 * structured ingredient data instead of pre-baked HTML strings (see plan
 * decision: React should not receive raw HTML from the API for this).
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

      const isSnack =
        meal.includes('Phụ') ||
        lowDish.includes('sữa') ||
        lowDish.includes('trái cây') ||
        lowDish.includes('hoa quả');

      if (isSnack) {
        if (lowDish.includes('sữa f100') || lowDish.includes('sữa cao nl') || lowDish.includes('pedia')) {
          const ml = roundToStep(mealKcal / 1.0, 10);
          ingredients.push({ icon: '🥛', amount: ml, unit: 'ml', label: 'sữa đặc trị' });
        } else if (lowDish.includes('sữa')) {
          const ml = roundToStep(mealKcal / 0.65, 10);
          if (ml > 250) {
            ingredients.push({ icon: '🥛', amount: 200, unit: 'ml', label: 'sữa' });
            ingredients.push({
              icon: '🍎',
              amount: roundToStep((mealKcal - 130) / 0.5, 5),
              unit: 'g',
              label: 'trái cây/bánh',
            });
          } else {
            ingredients.push({ icon: '🥛', amount: ml, unit: 'ml', label: 'sữa tươi/chua' });
          }
        } else {
          const g = roundToStep(mealKcal / 0.5, 10);
          ingredients.push({ icon: '🍎', amount: g, unit: 'g', label: 'trái cây tươi' });
        }
      } else {
        // Main meals
        let carbName = 'cơm tẻ';
        let carbIcon = '🍚';
        let carbDensity = 0.28; // 28g carb per 100g cooked rice

        if (lowDish.includes('phở') || lowDish.includes('bún') || lowDish.includes('mì')) {
          carbName = 'bún/phở';
          carbIcon = '🍜';
          carbDensity = 0.2;
        } else if (lowDish.includes('sữa hạt')) {
          carbName = 'sữa hạt';
          carbIcon = '🌰';
          carbDensity = 0.6;
        } else if (lowDish.includes('cháo')) {
          carbName = 'cháo đặc';
          carbIcon = '🍲';
          carbDensity = 0.15;
        } else if (lowDish.includes('xôi')) {
          carbName = 'xôi/nếp';
          carbIcon = '🍙';
          carbDensity = 0.4;
        } else if (lowDish.includes('cơm lứt')) {
          carbName = 'cơm gạo lứt';
          carbDensity = 0.25;
        } else if (lowDish.includes('bánh mì')) {
          carbName = 'bánh mì';
          carbIcon = '🥖';
          carbDensity = 0.5;
        }

        const isSuaHat = lowDish.includes('sữa hạt');
        const wCarb = roundToStep(mCarbG / carbDensity, 5);
        ingredients.push({
          icon: carbIcon,
          amount: wCarb,
          unit: 'g',
          label: isSuaHat ? carbName : `${carbName} chín`,
        });

        // proName/wPro/fatFromMeat/wFat are computed unconditionally (matching legacy,
        // where they're plain local vars in the main-meal branch) — only the *rendering*
        // of the protein and veggie lines is skipped for "sữa hạt" dishes. Critically,
        // the legacy code does NOT skip the fat line for "sữa hạt" (no such guard existed
        // on that branch) — preserved here exactly, even though it looks asymmetric.
        let proName = 'thịt/cá/trứng';
        if (lowDish.includes('gà')) proName = 'thịt gà';
        else if (lowDish.includes('bò')) proName = 'thịt bò';
        else if (
          lowDish.includes('cá') ||
          lowDish.includes('tôm') ||
          lowDish.includes('mực') ||
          lowDish.includes('cua')
        )
          proName = 'cá/tôm/hải sản';
        else if (lowDish.includes('đậu phụ') || lowDish.includes('chay')) proName = 'đậu phụ';
        else if (
          lowDish.includes('lợn') ||
          lowDish.includes('heo') ||
          lowDish.includes('sườn') ||
          lowDish.includes('thịt băm')
        )
          proName = 'thịt lợn nạc';

        const isGrilled = lowDish.includes('nướng') || lowDish.includes('áp chảo');
        if (isGrilled) proName += ' (nướng/áp chảo ít dầu)';

        const proDensity = proName === 'đậu phụ' ? 0.1 : 0.2;
        const wPro = roundToStep(mProG / proDensity, 5);
        if (!isSuaHat) {
          ingredients.push({ icon: '🥩', amount: wPro, unit: 'g', label: `${proName} chín` });
        }

        const isCongee = lowDish.includes('cháo');
        if (!isCongee && !isSuaHat) {
          let wVeg = months < 24 ? 50 : months < 72 ? 80 : 120;
          let vegName = 'rau xanh chín';
          const vegIcon = '🥗';
          if (lowDish.includes('salad')) {
            vegName = 'salad rau củ tươi';
            wVeg = wVeg * 1.5;
          }
          ingredients.push({ icon: vegIcon, amount: Math.round(wVeg), unit: 'g', label: vegName });
        }

        let fatFromMeat = wPro * 0.05; // rough estimate
        if (statusKey.includes('Béo phì')) fatFromMeat = wPro * 0.02; // lean
        else if (statusKey.includes('Suy dinh')) fatFromMeat = wPro * 0.08; // fatty
        if (isGrilled) fatFromMeat = wPro * 0.02; // very lean

        const addedFat = Math.max(0, mLipidG - fatFromMeat);
        const wFat = Math.round(addedFat);

        if (wFat > 2) {
          if (statusKey.includes('Béo phì') || statusKey.includes('Thừa cân')) {
            ingredients.push({
              icon: '🥜',
              amount: wFat * 2,
              unit: 'g',
              label: 'hạt dinh dưỡng (óc chó, macca) thay dầu',
            });
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
