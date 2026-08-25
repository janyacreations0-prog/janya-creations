import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Auth callback — exchanges the PKCE code for a session.
 *
 * Handles:
 * - Email verification (signup confirmation link)
 * - Password recovery (redirects on to /reset-password via ?next=)
 * - OAuth callbacks (architecture ready; Google is currently disabled)
 *
 * ?code is exchanged for the session; ?next (optional) controls where the
 * user lands afterwards. Any failure lands on /login with an error param.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Keep any forwarded path as-is; default to home.
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv && forwardedHost) {
        return NextResponse.redirect(`http://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
