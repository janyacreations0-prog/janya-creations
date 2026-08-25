'use server';

import { createClient } from '@/lib/supabase/server';

export interface CartMutationResult {
  success: boolean;
  error?: string;
  /** Fresh cart state after the mutation: product ids + quantities. */
  items?: { product_id: string; quantity: number }[];
}

export interface GuestCartItem {
  productId: string;
  quantity: number;
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
    .select('id, price, stock_quantity')
    .eq('id', productId)
    .maybeSingle();
  return data ?? null;
}

async function fetchCartItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cartId: string
): Promise<{ product_id: string; quantity: number }[]> {
  const { data } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .eq('cart_id', cartId);
  return (data ?? []).map((r: any) => ({
    product_id: r.product_id as string,
    quantity: r.quantity as number,
  }));
}

function clampQuantity(qty: number, stock: number): number {
  const q = Math.floor(Number(qty));
  if (Number.isNaN(q) || q < 1) return 1;
  return Math.min(q, stock);
}

export async function addCartItem(
  productId: string,
  quantity = 1
): Promise<CartMutationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required.' };

    const product = await readProduct(supabase, productId);
    if (!product) return { success: false, error: 'Product is unavailable.' };
    if ((product.stock_quantity ?? 0) <= 0) {
      return { success: false, error: 'Product is currently out of stock.' };
    }

    const qty = clampQuantity(quantity, product.stock_quantity);
    const cartId = await getCartId(supabase, user.id);
    if (!cartId) return { success: false, error: 'Unable to update cart. Please try again.' };

    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      const nextQty = Math.min(existing.quantity + qty, product.stock_quantity);
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: nextQty, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return { success: false, error: 'Unable to update cart. Please try again.' };
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ cart_id: cartId, product_id: productId, quantity: qty });
      if (error) return { success: false, error: 'Unable to update cart. Please try again.' };
    }

    return { success: true, items: await fetchCartItems(supabase, cartId) };
  } catch (e) {
    return { success: false, error: 'Unable to update cart. Please try again.' };
  }
}

export async function updateCartItem(
  productId: string,
  quantity: number
): Promise<CartMutationResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required.' };

    const product = await readProduct(supabase, productId);
    if (!product) return { success: false, error: 'Product is unavailable.' };

    const cartId = await getCartId(supabase, user.id);
    if (!cartId) return { success: false, error: 'Unable to update cart. Please try again.' };

    const qty = clampQuantity(quantity, Math.max(product.stock_quantity, 1));
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity: qty, updated_at: new Date().toISOString() })
      .eq('cart_id', cartId)
      .eq('product_id', productId);
    if (error) return { success: false, error: 'Unable to update cart. Please try again.' };

    return { success: true, items: await fetchCartItems(supabase, cartId) };
  } catch (e) {
    return { success: false, error: 'Unable to update cart. Please try again.' };
  }
}

export async function removeCartItem(productId: string): Promise<CartMutationResult> {
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
      .eq('product_id', productId);
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
 * Quantities are summed and capped at available stock; unavailable/out-of-stock
 * items are skipped. Returns the fresh cart state.
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
      const product = await readProduct(supabase, item.productId);
      if (!product || (product.stock_quantity ?? 0) <= 0) continue;

      const qty = clampQuantity(item.quantity, product.stock_quantity);
      const { data: existing } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('cart_id', cartId)
        .eq('product_id', item.productId)
        .maybeSingle();

      if (existing) {
        const nextQty = Math.min(existing.quantity + qty, product.stock_quantity);
        await supabase
          .from('cart_items')
          .update({ quantity: nextQty, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('cart_items').insert({
          cart_id: cartId,
          product_id: item.productId,
          quantity: qty,
        });
      }
    }

    return { success: true, items: await fetchCartItems(supabase, cartId) };
  } catch (e) {
    return { success: false, error: 'Unable to merge cart. Please try again.' };
  }
}
