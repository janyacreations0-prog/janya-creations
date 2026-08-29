import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { applyAttribution } from '@/lib/analytics-middleware';

/**
 * Middleware:
 *  - Runs first-party attribution capture (session + UTM cookies) on every
 *    public page request — pure cookie handling, no auth round-trip, so the
 *    storefront stays fast.
 *  - Runs the Supabase auth session refresh ONLY on private/authenticated
 *    paths (preserving the original performance decision for public pages).
 */
const PRIVATE_PREFIXES = [
  '/admin',
  '/orders',
  '/profile',
  '/checkout',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/api',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPrivate = PRIVATE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  const response = isPrivate ? await updateSession(request) : NextResponse.next();

  return applyAttribution(request, response);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico|css|js|woff2?|ttf)$).*)',
  ],
};
