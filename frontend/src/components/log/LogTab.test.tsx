import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppStateProvider } from '../../context/AppStateContext';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../shared/ToastContext';
import { LogTab } from './LogTab';

const samplePatients = vi.hoisted(() => [
  {
    id: '1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    name: 'Nguyễn Văn A',
    dob: '2023-01-01',
    examDate: '2026-01-10',
    gender: 'Nam',
    weight: 12,
    height: 85,
    muac: null,
    revisit: null,
    guardianEmail: null,
    tuvan: 'Có',
    labCa: null,
    labVitD: null,
    labZn: null,
    labHb: null,
    labFe: null,
    labFerritin: null,
    labChol: null,
    labTg: null,
    months: 36,
    bmi: 16.6,
    wfa: 'Bình thường',
    hfa: 'Bình thường',
    wfh: 'Bình thường',
    muacStatus: null,
    stdEnergy: 1200,
    targetEnergy: 1200,
    carbG: 150,
    proteinG: 45,
    lipidG: 40,
    labAssessmentSummary: 'Bình thường',
    fullResult: {},
    stt: 1,
  },
  {
    id: '2',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    name: 'Trần Thị B',
    dob: '2022-01-01',
    examDate: '2026-02-15',
    gender: 'Nữ',
    weight: 9,
    height: 80,
    muac: null,
    revisit: null,
    guardianEmail: null,
    tuvan: 'Không',
    labCa: null,
    labVitD: null,
    labZn: null,
    labHb: null,
    labFe: null,
    labFerritin: null,
    labChol: null,
    labTg: null,
    months: 48,
    bmi: 14.1,
    wfa: 'Nhẹ cân',
    hfa: 'Thấp còi',
    wfh: 'Suy dinh dưỡng cấp',
    muacStatus: null,
    stdEnergy: 1300,
    targetEnergy: 1300,
    carbG: 160,
    proteinG: 48,
    lipidG: 42,
    labAssessmentSummary: 'Bình thường',
    fullResult: {},
    stt: 2,
  },
]);

vi.mock('../../api/patients', () => ({
  listPatients: vi.fn().mockResolvedValue(samplePatients),
  createPatient: vi.fn(),
  deletePatient: vi.fn(),
}));

const meMock = vi.hoisted(() => vi.fn());
vi.mock('../../api/auth', () => ({
  getMe: meMock,
  login: vi.fn(),
  logout: vi.fn(),
}));

function renderLogTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <AppStateProvider>
            <LogTab />
          </AppStateProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('LogTab search/filter/stats', () => {
  it('shows stat tiles reflecting all patients, then narrows on search', async () => {
    meMock.mockResolvedValue({ user: { id: 'u1', name: 'BS An', email: 'a@test.local', role: 'bac_si', status: 'active' as const } });
    renderLogTab();

    await waitFor(() => expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument());
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    expect(screen.getByText('Tổng số hồ sơ')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Nguyễn Văn A'), { target: { value: 'Trần' } });

    expect(screen.queryByText('Nguyễn Văn A')).not.toBeInTheDocument();
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
  });

  it('hides the delete button for a dieu_duong (nurse) account', async () => {
    meMock.mockResolvedValue({ user: { id: 'u2', name: 'ĐD Bình', email: 'b@test.local', role: 'dieu_duong', status: 'active' as const } });
    renderLogTab();

    await waitFor(() => expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument());
    expect(screen.queryByText('🗑️')).not.toBeInTheDocument();
  });
});
