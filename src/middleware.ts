import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Session refresh only runs where an authenticated session is actually
     * relevant — avoiding a Supabase auth round-trip on public storefront
     * pages (/, /shop, /category, /products, policies, etc.).
     *
     * Public pages render from anonymous/RLS data and manage auth entirely
     * in the browser, so they skip the middleware entirely.
     */
    '/admin/:path*',
    '/orders/:path*',
    '/profile/:path*',
    '/checkout',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/auth/:path*',
    '/api/:path*',
  ],
};
