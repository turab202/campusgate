import { NextResponse } from 'next/server';
import { BACKEND_API_BASE, hasSameOrigin, SESSION_COOKIE, tokenMaxAge } from '../../../../src/server/session';

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ detail: 'Cross-origin request rejected.' }, { status: 403 });
  }

  let credentials: unknown;
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid request body.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${BACKEND_API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(credentials),
      cache: 'no-store',
    });
    const body: unknown = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return NextResponse.json(body ?? { detail: 'Login failed.' }, { status: upstream.status });
    }
    if (!body || typeof body !== 'object' || !('access_token' in body) || typeof body.access_token !== 'string') {
      return NextResponse.json({ detail: 'Authentication service returned an invalid response.' }, { status: 502 });
    }

    const token = body.access_token;
    const maxAge = tokenMaxAge(token);
    if (!maxAge) {
      return NextResponse.json({ detail: 'Authentication service returned an invalid session.' }, { status: 502 });
    }

    const { access_token: _token, ...publicBody } = body;
    const response = NextResponse.json(publicBody, {
      headers: { 'Cache-Control': 'no-store' },
    });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    });
    return response;
  } catch {
    return NextResponse.json({ detail: 'Authentication service is unavailable.' }, { status: 502 });
  }
}