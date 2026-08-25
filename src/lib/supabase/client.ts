import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Supabase client for Client Components. Persists the session in cookies so
 * Server Components / Route Handlers / middleware can authorize the user.
 */
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
