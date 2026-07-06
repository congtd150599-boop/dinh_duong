import type { WeeklyMenu } from '@dinhduong/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WeeklyMenuTable } from './WeeklyMenuTable';

const mockDish = {
  dishName: 'Cháo gà xay nhuyễn',
  mealKcal: 240,
  ingredients: [{ icon: '🍲', amount: 150, unit: 'g', label: 'cháo đặc chín' }],
};

const menu: WeeklyMenu = {
  'Sáng': [mockDish, mockDish, mockDish, mockDish, mockDish, mockDish, mockDish],
  'Phụ sáng': ['—', '—', '—', '—', '—', '—', '—'],
  'Trưa': ['—', '—', '—', '—', '—', '—', '—'],
  'Phụ chiều': ['—', '—', '—', '—', '—', '—', '—'],
  'Tối': ['—', '—', '—', '—', '—', '—', '—'],
  'Phụ tối': ['—', '—', '—', '—', '—', '—', '—'],
  note: 'Ghi chú test.',
};

describe('WeeklyMenuTable', () => {
  it('renders 7 columns of dishes for the Sáng row and the meal total footer', () => {
    render(<WeeklyMenuTable menu={menu} targetEnergy={1200} />);

    expect(screen.getAllByText('Cháo gà xay nhuyễn')).toHaveLength(7);
    expect(screen.getByText(/~ 1200 kcal \/ ngày/)).toBeInTheDocument();
    expect(screen.getByText('Ghi chú test.')).toBeInTheDocument();
  });

  it('renders "—" placeholder for empty meal slots', () => {
    render(<WeeklyMenuTable menu={menu} targetEnergy={1200} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
