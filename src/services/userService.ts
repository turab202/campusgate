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

export type ManagedRole = 'GATE_OFFICER' | 'PROCTOR' | 'ADMIN';

export interface ManagedUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  role: ManagedRole;
  campus_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateManagedUserRequest {
  full_name: string;
  email: string;
  password: string;
  role: ManagedRole;
  phone?: string | null;
  campus_id?: string | null;
}

export interface UpdateManagedUserRequest {
  full_name?: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: ManagedRole;
  is_active?: boolean;
}

export async function searchUsersApi(query: string): Promise<UserSearchResult[]> {
  return api.get<UserSearchResult[]>(`/users?search=${encodeURIComponent(query)}`);
}

export async function registerUserApi(payload: RegisterUserRequest): Promise<RegisterUserResponse> {
  return api.post<RegisterUserResponse>('/users', payload);
}

export async function listManagedUsersApi(): Promise<ManagedUser[]> {
  return api.get<ManagedUser[]>('/users/managed');
}

export async function createManagedUserApi(payload: CreateManagedUserRequest): Promise<ManagedUser> {
  return api.post<ManagedUser>('/users/managed', payload);
}

export async function updateManagedUserApi(
  userId: string,
  payload: UpdateManagedUserRequest,
): Promise<ManagedUser> {
  return api.patch<ManagedUser>(`/users/managed/${encodeURIComponent(userId)}`, payload);
}
