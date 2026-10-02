import { api } from './api';

export interface UserSearchResult {
  id: string;
  campus_id: string | null;
  full_name: string;
  email: string;
  role: string;
}

export async function searchUsersApi(query: string): Promise<UserSearchResult[]> {
  return api.get<UserSearchResult[]>(`/users?search=${encodeURIComponent(query)}`);
}
