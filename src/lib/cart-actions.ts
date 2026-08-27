'use server';

import { createClient } from '@/lib/supabase/server';
import { parseSizes } from '@/lib/sizes';

export interface CartMutationResult {
  success: boolean;
  error?: string;
  /** Fresh cart state after the mutation: product ids + variants + quantities. */
  items?: { product_id: string; variant: string; quantity: number }[];
}

export interface GuestCartItem {
  productId: string;
  quantity: number;
  /** Selected size/option value (e.g. "Free Size"); empty when none. */
  variant?: string;
}

async function getCartId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: existing } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single();
  if (error) return null;
  return data?.id as string;
}

async function readProduct(supabase: Awaited<ReturnType<typeof createClient>>, productId: string) {
  const { data } = await supabase
    .from('products')
    .select('id, price, stock_quantity, attributes')
    .eq('id', productId)
    .maybeSingle();
  return data ?? null;
}

/** Resolves the available stock for a cart line (per-variant when selected). */
function variantStock(
  product: { stock_quantity?: number | null; attributes?: Record<string, unknown> | null },
  variant: string
): number {
  if (!variant) return Number(product.stock_quantity) || 0;
  const opt = parseSizes(product.attributes ?? null).find((s) => s.value === variant);
  return opt ? opt.stock : 0;
}

async function fetchCartItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cartId: string
): Promise<{ product_id: string; variant: string; quantity: number }[]> {
  const { data } = await supabase
    .from('cart_items')
    .select('product_id, variant, quantity')
    .eq('cart_id', cartId);
  return (data ?? []).map((r: any) => ({
    product_id: r.product_id as string,
    variant: (r.variant as string) || '',
    quantity: r.quantity as number,
  }));
}

function clampQuantity(qty: number, stock: number): number {
  const q = Math.floor(Number(qty));
  if (Number.isNaN(q) || q < 1) return 1;
  if (stock <= 0) return 1;
  return Math.min(q, stock);
}

export async function addCartItem(
  productId: string,
  quantity = 1,
  variant = ''
): Promise<CartMutationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required.' };

    const product = await readProduct(supabase, productId);
    if (!product) return { success: false, error: 'Product is unavailable.' };

    const stock = variantStock(product, variant);
    if (stock <= 0) {
      return { success: false, error: 'This size is currently out of stock.' };
    }

    const qty = clampQuantity(quantity, stock);
    const cartId = await getCartId(supabase, user.id);
    if (!cartId) return { success: false, error: 'Unable to update cart. Please try again.' };

    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .eq('variant', variant)
      .maybeSingle();

    if (existing) {
      const nextQty = Math.min(existing.quantity + qty, stock);
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: nextQty, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return { success: false, error: 'Unable to update cart. Please try again.' };
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ cart_id: cartId, product_id: productId, variant, quantity: qty });
      if (error) return { success: false, error: 'Unable to update cart. Please try again.' };
    }

    return { success: true, items: await fetchCartItems(supabase, cartId) };
  } catch (e) {
    return { success: false, error: 'Unable to update cart. Please try again.' };
  }
}

export async function updateCartItem(
  productId: string,
  quantity: number,
  variant = ''
): Promise<CartMutationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required.' };

    const product = await readProduct(supabase, productId);
    if (!product) return { success: false, error: 'Product is unavailable.' };

    const stock = variantStock(product, variant);
    const cartId = await getCartId(supabase, user.id);
    if (!cartId) return { success: false, error: 'Unable to update cart. Please try again.' };

    const qty = stock > 0 ? clampQuantity(quantity, stock) : Math.max(1, Math.floor(quantity) || 1);
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: qty, updated_at: new Date().toISOString() })
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .eq('variant', variant);
    if (error) return { success: false, error: 'Unable to update cart. Please try again.' };

    return { success: true, items: await fetchCartItems(supabase, cartId) };
  } catch (e) {
    return { success: false, error: 'Unable to update cart. Please try again.' };
  }
}

export async function removeCartItem(productId: string, variant = ''): Promise<CartMutationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required.' };

    const cartId = await getCartId(supabase, user.id);
    if (!cartId) return { success: true, items: [] };

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .eq('variant', variant);
    if (error) return { success: false, error: 'Unable to update cart. Please try again.' };

    return { success: true, items: await fetchCartItems(supabase, cartId) };
  } catch (e) {
    return { success: false, error: 'Unable to update cart. Please try again.' };
  }
}

export async function clearServerCart(): Promise<CartMutationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required.' };

    const cartId = await getCartId(supabase, user.id);
    if (cartId) {
      const { error } = await supabase.from('cart_items').delete().eq('cart_id', cartId);
      if (error) return { success: false, error: 'Unable to clear cart. Please try again.' };
    }
    return { success: true, items: [] };
  } catch (e) {
    return { success: false, error: 'Unable to clear cart. Please try again.' };
  }
}

/**
 * Merges a guest (localStorage) cart into the authenticated user's server cart.
 * Lines are keyed by (product, variant); quantities are summed and capped at the
 * variant's stock. Unavailable/out-of-stock lines are skipped.
 */
export async function mergeGuestCart(
  items: GuestCartItem[]
): Promise<CartMutationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required.' };

    const cartId = await getCartId(supabase, user.id);
    if (!cartId) return { success: false, error: 'Unable to update cart. Please try again.' };

    for (const item of items) {
      if (!item?.productId) continue;
      const variant = item.variant || '';
      const product = await readProduct(supabase, item.productId);
      if (!product) continue;

      const stock = variantStock(product, variant);
      if (stock <= 0) continue;

      const qty = clampQuantity(item.quantity, stock);
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('product_id', item.productId)
        .eq('variant', variant)
        .maybeSingle();

      if (existing) {
        const nextQty = Math.min(existing.quantity + qty, stock);
        await supabase
          .from('cart_items')
          .update({ quantity: nextQty, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('cart_items').insert({
          cart_id: cartId,
          product_id: item.productId,
          variant,
          quantity: qty,
        });
      }
    }

    return { success: true, items: await fetchCartItems(supabase, cartId) };
  } catch (e) {
    return { success: false, error: 'Unable to merge cart. Please try again.' };
  }
}
