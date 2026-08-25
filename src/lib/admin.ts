import { createClient } from '@/lib/supabase/server';

/**
 * Server-side authorization helpers.
 * All checks fail closed (return false / null) if the profiles table is
 * unreachable, so admin access is denied by default before migrations run.
 */

export async function getAuthUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * Returns true only when a valid session exists AND profiles.role = 'admin'.
 * Accepts an optional user (from getAuthUser) to avoid a redundant fetch.
 */
export async function isAdminUser(userOverride?: Awaited<ReturnType<typeof getAuthUser>>): Promise<boolean> {
  const user = userOverride ?? (await getAuthUser());
  if (!user) return false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) return false;
    return data.role === 'admin';
  } catch {
    return false;
  }
}
