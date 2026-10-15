import { NextResponse } from 'next/server';
import { hasSameOrigin, SESSION_COOKIE } from '../../../../src/server/session';

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ detail: 'Cross-origin request rejected.' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true }, {
    headers: { 'Cache-Control': 'no-store' },
  });
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}