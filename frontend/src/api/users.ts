import type { Role, UserRecord } from '@dinhduong/shared';
import { apiClient } from './client';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  isActive?: boolean;
}

export function listUsers(): Promise<UserRecord[]> {
  return apiClient.get<UserRecord[]>('/users');
}

export function createUser(input: CreateUserInput): Promise<UserRecord> {
  return apiClient.post<UserRecord>('/users', input);
}

export function updateUser(id: string, input: UpdateUserInput): Promise<UserRecord> {
  return apiClient.patch<UserRecord>(`/users/${id}`, input);
}

export function resetPassword(id: string, newPassword: string): Promise<void> {
  return apiClient.post(`/users/${id}/reset-password`, { newPassword });
}
