import type { RegisterInput, UserRecord } from '@dinhduong/shared';
import { apiClient } from './client';

export function login(email: string, password: string): Promise<{ user: UserRecord }> {
  return apiClient.post<{ user: UserRecord }>('/auth/login', { email, password });
}

export function register(input: RegisterInput): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/register', input);
}

export function logout(): Promise<void> {
  return apiClient.post('/auth/logout', {});
}

export function getMe(): Promise<{ user: UserRecord }> {
  return apiClient.get<{ user: UserRecord }>('/auth/me');
}
