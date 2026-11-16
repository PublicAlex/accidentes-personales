import { request } from './client';
import type { User } from './types';

export function registerUser(input: { email: string; password: string; fullName: string }): Promise<unknown> {
  return request('POST', '/auth/register', input);
}

export function loginUser(input: { email: string; password: string }): Promise<User> {
  return request<User>('POST', '/auth/login', input);
}

export function logoutUser(): Promise<void> {
  return request<void>('POST', '/auth/logout');
}

export function getMe(): Promise<User> {
  return request<User>('GET', '/auth/me');
}
