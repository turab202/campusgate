import { ApiError, api } from './api';

// ---------------------------------------------------------------------------
// Backend response shapes (matching FastAPI schemas)
// ---------------------------------------------------------------------------

export type BackendRole = 'STUDENT' | 'STAFF' | 'GATE_OFFICER' | 'PROCTOR' | 'ADMIN';

export interface TokenResponse {
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

export async function loginApi(email: string, password: string): Promise<void> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ email, password }),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const detail = body && typeof body === 'object' && 'detail' in body
      ? body.detail
      : 'Login failed.';
    throw new ApiError(response.status, typeof detail === 'string' ? detail : 'Login failed.', body);
  }
}

export async function logoutApi(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!response.ok) throw new ApiError(response.status, 'Logout failed.');
}

export async function meApi(): Promise<MeResponse> {
  return api.get<MeResponse>('/auth/me');
}

export interface UpdateStudentCredentialsRequest {
  current_password: string;
  email?: string;
  new_password?: string;
}

export async function updateStudentCredentialsApi(
  payload: UpdateStudentCredentialsRequest,
): Promise<MeResponse> {
  return api.patch<MeResponse>('/auth/me/credentials', payload);
}
