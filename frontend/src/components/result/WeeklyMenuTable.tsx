import type { MealSlot, MenuDish, WeeklyMenu } from '@dinhduong/shared';

const DAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
const MEALS: MealSlot[] = ['Sáng', 'Phụ sáng', 'Trưa', 'Phụ chiều', 'Tối', 'Phụ tối'];
const MEAL_TIMES: Record<MealSlot, string> = {
  'Sáng': '07:00',
  'Phụ sáng': '09:30',
  'Trưa': '12:00',
  'Phụ chiều': '15:30',
  'Tối': '18:30',
  'Phụ tối': '20:30',
};

function DishCell({ dish }: { dish: MenuDish | '—' }) {
  if (dish === '—') return <>—</>;
  return (
    <>
      <div className="menu-dish-name">{dish.dishName}</div>
      <ul className="menu-ingredients">
        {dish.ingredients.map((ing, i) => (
          <li key={i}>
            {ing.icon} {ing.amount}
            {ing.unit} {ing.label}
          </li>
        ))}
      </ul>
      <div className="menu-qty-total">Tổng: {dish.mealKcal} kcal</div>
    </>
  );
}

export function WeeklyMenuTable({ menu, targetEnergy }: { menu: WeeklyMenu; targetEnergy: number }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="menu-table">
        <thead>
          <tr>
            <th style={{ minWidth: 100 }}>Bữa ăn</th>
            {DAYS.map((d) => (
              <th key={d} style={{ minWidth: 140 }}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEALS.map((meal) => (
            <tr key={meal}>
              <td className="meal-label">
                {meal}
                <br />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{MEAL_TIMES[meal]}</span>
              </td>
              {DAYS.map((_, i) => (
                <td key={i}>
                  <DishCell dish={menu[meal][i] ?? '—'} />
                </td>
              ))}
            </tr>
          ))}
          <tr style={{ background: '#E8F5E9', fontWeight: 700, color: '#2E7D32' }}>
            <td className="meal-label">Tổng cộng</td>
            <td colSpan={7} style={{ textAlign: 'center' }}>
              ~ {targetEnergy} kcal / ngày (100% NL Mục Tiêu)
            </td>
          </tr>
          <tr>
            <td className="meal-label">Lưu ý</td>
            <td colSpan={7} style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
              {menu.note}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
