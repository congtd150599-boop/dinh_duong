import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppStateProvider } from '../../context/AppStateContext';
import { ToastProvider } from '../shared/ToastContext';
import { InputTab } from './InputTab';

vi.mock('../../api/assessments', () => ({
  postAssessment: vi.fn().mockRejectedValue(new Error('not used in this smoke test')),
}));

function renderInputTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppStateProvider>
          <InputTab />
        </AppStateProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('InputTab', () => {
  it('renders all required patient fields', () => {
    renderInputTab();

    expect(screen.getByPlaceholderText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('VD: 15.5')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('VD: 95.0')).toBeInTheDocument();
    expect(screen.getByText('♂ Nam')).toBeInTheDocument();
    expect(screen.getByText('♀ Nữ')).toBeInTheDocument();
  });

  it('renders the save and view-report action buttons', () => {
    renderInputTab();
    expect(screen.getByRole('button', { name: /Lưu Hồ Sơ/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Xem Báo Cáo Chi Tiết/ })).toBeInTheDocument();
  });
});
