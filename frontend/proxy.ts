import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { STAFF_ROLES } from '@/lib/constants';

// Paths that are exempt from CSRF checks (server-to-server or use their own auth)
const CSRF_EXEMPT = [
  '/api/auth/login',
  '/api/auth/oauth-sync',
  '/api/auth/refresh',
  '/api/revalidate',
  '/api/webhooks/',
  '/api/auth/[...nextauth]',
];

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_SITE_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean) as string[];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // -- Admin protection ----------------------------------
  if (pathname.startsWith('/admin')) {
    const secret =
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      (process.env.NODE_ENV === 'development'
        ? 'dev-fallback-secret-do-not-use-in-production-32chars!!'
        : undefined);
    const token = await getToken({ req: request, secret });
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const role = token.role as string | undefined;
    if (!STAFF_ROLES.includes(role ?? '')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // -- Structural CSRF for API write routes -------------
  if (
    pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    !CSRF_EXEMPT.some(exempt => pathname.startsWith(exempt))
  ) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    if (!origin && !referer) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'CSRF: missing origin' }, { status: 403 });
      }
    } else {
      const sourceUrl = origin || referer || '';
      const isAllowed = ALLOWED_ORIGINS.some(allowed => sourceUrl.startsWith(allowed));
      if (!isAllowed) {
        return NextResponse.json({ error: 'CSRF: origin not allowed' }, { status: 403 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
  ],
};
