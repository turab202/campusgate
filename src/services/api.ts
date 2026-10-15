/**
 * Centralized API client for CampusGate backend.
 *
 * All fetch calls go through here — no scattered fetch() in components.
 * Requests use the same-origin Next.js API proxy. The server-side proxy reads
 * the HttpOnly session cookie and forwards the backend bearer token.
 */

const BASE = '/api/v1';

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
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    cache: 'no-store',
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
  get: <T>(path: string) =>
    request<T>('GET', path),

  post: <T>(path: string, body?: unknown) =>
    request<T>('POST', path, body),

  patch: <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, body),

  delete: <T>(path: string) =>
    request<T>('DELETE', path),
};
