import { api } from './api';

// ---------------------------------------------------------------------------
// Backend response shapes (matching FastAPI schemas)
// ---------------------------------------------------------------------------

export type BackendRole = 'STUDENT' | 'STAFF' | 'GATE_OFFICER' | 'ADMIN';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: BackendRole;
  full_name: string;
}

export interface MeResponse {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: BackendRole;
  campus_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Frontend-normalised user shape (used by AppContext)
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: BackendRole;
  campus_id: string | null;
  phone: string | null;
  is_active: boolean;
}

export function meToAuthUser(me: MeResponse): AuthUser {
  return {
    id: me.id,
    name: me.full_name,
    email: me.email,
    role: me.role,
    campus_id: me.campus_id,
    phone: me.phone,
    is_active: me.is_active,
  };
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function loginApi(email: string, password: string): Promise<TokenResponse> {
  return api.post<TokenResponse>('/auth/login', { email, password }, false);
}

export async function meApi(): Promise<MeResponse> {
  return api.get<MeResponse>('/auth/me');
}
