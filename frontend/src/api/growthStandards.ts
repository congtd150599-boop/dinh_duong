import { ApiError } from './client';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export interface GrowthStandardRecord {
  gender: 'Nam' | 'Nữ';
  metric: 'WFA' | 'HFA';
  months: number;
  median: number;
  source: string;
}

export function growthStandardsExportUrl(): string {
  return `${API_URL}/growth-standards/export`;
}

export async function listGrowthStandards(): Promise<GrowthStandardRecord[]> {
  const res = await fetch(`${API_URL}/growth-standards`, { credentials: 'include' });
  if (!res.ok) throw new ApiError('Failed to list growth standards', res.status);
  return res.json();
}

export async function importGrowthStandardsCsv(csvText: string): Promise<{ imported: number }> {
  const res = await fetch(`${API_URL}/growth-standards/import`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
    body: csvText,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error ?? 'Import thất bại', res.status, body);
  }
  return body;
}
