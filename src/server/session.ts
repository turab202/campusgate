export const SESSION_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Host-cg_session'
  : 'cg_session';

export const BACKEND_API_BASE = (
  process.env.BACKEND_API_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? 'http://localhost:8000'
).replace(/\/+$/, '');

export function tokenMaxAge(token: string): number {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return 0;
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as { exp?: unknown };
    if (typeof payload.exp !== 'number') return 0;
    return Math.max(0, payload.exp - Math.floor(Date.now() / 1000));
  } catch {
    return 0;
  }
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set([requestUrl.origin]);
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host) {
    const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
      ?? requestUrl.protocol.slice(0, -1);
    try {
      allowedOrigins.add(new URL(`${protocol}://${host}`).origin);
    } catch {
      return false;
    }
  }

  return allowedOrigins.has(origin);
}