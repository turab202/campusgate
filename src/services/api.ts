/**
 * Centralized API client for CampusGate backend.
 *
 * All fetch calls go through here — no scattered fetch() in components.
 * Base URL is read from NEXT_PUBLIC_API_URL env var.
 * Bearer token is read from localStorage key 'cg_token'.
 */

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api/v1';
const TOKEN_KEY = 'cg_token';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Extract a human-readable message from a FastAPI error response body. */
function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b.detail === 'string') return b.detail;
    if (Array.isArray(b.detail) && b.detail.length > 0) {
      const first = b.detail[0] as Record<string, unknown>;
      if (typeof first.msg === 'string') return first.msg;
    }
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  authenticated = true,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authenticated) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // No-content responses
  if (res.status === 204) return undefined as T;

  let responseBody: unknown;
  try {
    responseBody = await res.json();
  } catch {
    responseBody = null;
  }

  if (!res.ok) {
    const message = extractMessage(
      responseBody,
      `Request failed with status ${res.status}`,
    );
    throw new ApiError(res.status, message, responseBody);
  }

  return responseBody as T;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export const api = {
  get: <T>(path: string, authenticated = true) =>
    request<T>('GET', path, undefined, authenticated),

  post: <T>(path: string, body?: unknown, authenticated = true) =>
    request<T>('POST', path, body, authenticated),

  patch: <T>(path: string, body?: unknown, authenticated = true) =>
    request<T>('PATCH', path, body, authenticated),

  delete: <T>(path: string, authenticated = true) =>
    request<T>('DELETE', path, undefined, authenticated),
};
