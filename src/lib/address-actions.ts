'use server';

import { createClient } from '@/lib/supabase/server';

export interface SavedAddressInput {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface SavedAddressResult {
  success: boolean;
  error?: string;
}

/**
 * Saves a shipping address to the authenticated user's account.
 * RLS restricts each user to their own addresses; the server client carries
 * the user's session, so this is fully user-scoped (no service role).
 */
export async function saveCheckoutAddress(
  input: SavedAddressInput
): Promise<SavedAddressResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required.' };

    const { error } = await supabase.from('addresses').insert({
      user_id: user.id,
      full_name: String(input.name || '').trim(),
      phone: String(input.phone || '').trim(),
      line1: String(input.line1 || '').trim(),
      line2: String(input.line2 || '').trim(),
      city: String(input.city || '').trim(),
      state: String(input.state || '').trim(),
      pincode: String(input.pincode || '').trim(),
      country: String(input.country || 'India').trim(),
    });

    if (error) {
      console.error('saveCheckoutAddress error:', error.message);
      return { success: false, error: 'Failed to save address.' };
    }
    return { success: true };
  } catch (e) {
    console.error('saveCheckoutAddress error:', e);
    return { success: false, error: 'Failed to save address.' };
  }
}
