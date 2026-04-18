import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths the N9 device and login flow must reach without a session cookie
const PUBLIC = ['/login', '/api/auth', '/iclock'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiredPassword = process.env.DASHBOARD_PASSWORD;

  // No password configured → open access (local dev / first deploy)
  if (!requiredPassword) return NextResponse.next();

  // Always allow public paths
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Validate session cookie
  const session = request.cookies.get('bio-session')?.value;
  if (session === requiredPassword) return NextResponse.next();

  // Not authenticated
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Redirect browser requests to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
