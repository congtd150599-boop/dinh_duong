import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../shared/ToastContext';
import { GrowthStandardsTab } from './GrowthStandardsTab';

const sampleRecords = vi.hoisted(() => [
  { gender: 'Nam', metric: 'WFA', months: 0, median: 3.3, source: 'WHO' },
  { gender: 'Nữ', metric: 'WFA', months: 0, median: 3.2, source: 'WHO' },
  { gender: 'Nam', metric: 'WFA', months: 12, median: 9.6, source: 'WHO' },
  { gender: 'Nữ', metric: 'WFA', months: 12, median: 8.9, source: 'WHO' },
  { gender: 'Nam', metric: 'HFA', months: 0, median: 49.9, source: 'WHO' },
  { gender: 'Nữ', metric: 'HFA', months: 0, median: 49.1, source: 'WHO' },
  { gender: 'Nam', metric: 'HFA', months: 24, median: 87.1, source: 'WHO' },
  { gender: 'Nữ', metric: 'HFA', months: 24, median: 85.7, source: 'WHO' },
]);

vi.mock('../../api/growthStandards', () => ({
  listGrowthStandards: vi.fn().mockResolvedValue(sampleRecords),
  growthStandardsExportUrl: () => 'http://localhost/export',
  importGrowthStandardsCsv: vi.fn(),
}));

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <GrowthStandardsTab />
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('GrowthStandardsTab charts', () => {
  it('renders WFA and HFA growth curve charts with Nam/Nữ legends once data loads', async () => {
    renderTab();

    await waitFor(() => expect(screen.getByText(/Cân nặng theo tuổi/)).toBeInTheDocument());
    expect(screen.getByText(/Chiều cao theo tuổi/)).toBeInTheDocument();

    const namLabels = screen.getAllByText('Nam');
    const nuLabels = screen.getAllByText('Nữ');
    expect(namLabels.length).toBeGreaterThan(0);
    expect(nuLabels.length).toBeGreaterThan(0);
  });

  it('renders an svg line chart for each metric', async () => {
    const { container } = renderTab();
    await waitFor(() => expect(container.querySelectorAll('svg').length).toBe(2));
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBe(4);
  });
});
