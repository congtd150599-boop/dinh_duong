import type { FoodCategory, FoodConditionTag, FoodRecord } from '@dinhduong/shared';
import { apiClient, ApiError } from './client';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export interface CreateFoodInput {
  name: string;
  category: FoodCategory;
  kcalPer100: number;
  proteinPer100?: number;
  carbPer100?: number;
  fatPer100?: number;
  benefits?: string | null;
  cautionNote?: string | null;
  conditionTags?: FoodConditionTag[];
  source?: string | null;
}

export type UpdateFoodInput = Partial<CreateFoodInput>;

export function listFoods(): Promise<FoodRecord[]> {
  return apiClient.get<FoodRecord[]>('/foods');
}

export function createFood(input: CreateFoodInput): Promise<FoodRecord> {
  return apiClient.post<FoodRecord>('/foods', input);
}

export function updateFood(id: string, input: UpdateFoodInput): Promise<FoodRecord> {
  return apiClient.patch<FoodRecord>(`/foods/${id}`, input);
}

export function deleteFood(id: string): Promise<void> {
  return apiClient.delete(`/foods/${id}`);
}

export function foodsExportUrl(): string {
  return `${API_URL}/foods/export`;
}

export async function importFoodsCsv(csvText: string): Promise<{ imported: number }> {
  const res = await fetch(`${API_URL}/foods/import`, {
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
