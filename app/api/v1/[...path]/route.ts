import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_API_BASE, hasSameOrigin, SESSION_COOKIE } from '../../../../src/server/session';

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
  const method = request.method.toUpperCase();
  if (!['GET', 'HEAD'].includes(method) && !hasSameOrigin(request)) {
    return NextResponse.json({ detail: 'Cross-origin request rejected.' }, { status: 403 });
  }

  const { path } = await context.params;
  const backendUrl = new URL(
    `/api/v1/${path.map((part) => encodeURIComponent(part)).join('/')}`,
    BACKEND_API_BASE,
  );
  backendUrl.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');
  if (contentType) headers.set('Content-Type', contentType);
  if (accept) headers.set('Accept', accept);

  const sessionToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (sessionToken) headers.set('Authorization', `Bearer ${sessionToken}`);

  try {
    const upstream = await fetch(backendUrl, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method) ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
    });
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
    const upstreamContentType = upstream.headers.get('content-type');
    if (upstreamContentType) responseHeaders.set('Content-Type', upstreamContentType);
    return new Response(upstream.status === 204 ? null : await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json({ detail: 'Backend service is unavailable.' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;