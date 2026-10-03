import { api } from './api';

export interface UserSearchResult {
  id: string;
  campus_id: string | null;
  full_name: string;
  email: string;
  role: string;
}

export interface RegisterUserRequest {
  full_name: string;
  campus_id: string;
  department: string;
  email: string;
  phone?: string | null;
  password: string;
  role: 'STUDENT' | 'STAFF';
}

export interface RegisterUserResponse {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  role: 'STUDENT' | 'STAFF';
  campus_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function searchUsersApi(query: string): Promise<UserSearchResult[]> {
  return api.get<UserSearchResult[]>(`/users?search=${encodeURIComponent(query)}`);
}

export async function registerUserApi(payload: RegisterUserRequest): Promise<RegisterUserResponse> {
  return api.post<RegisterUserResponse>('/users', payload, false);
}
