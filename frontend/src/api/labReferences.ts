import { ApiError } from './client';
import type { LabReferenceRecord } from '@dinhduong/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export function labReferencesExportUrl(): string {
  return `${API_URL}/lab-references/export`;
}

export async function listLabReferences(): Promise<LabReferenceRecord[]> {
  const res = await fetch(`${API_URL}/lab-references`, { credentials: 'include' });
  if (!res.ok) throw new ApiError('Failed to list lab references', res.status);
  return res.json();
}

export async function importLabReferencesCsv(csvText: string): Promise<{ imported: number }> {
  const res = await fetch(`${API_URL}/lab-references/import`, {
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
