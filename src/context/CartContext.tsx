'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, ProductVariant } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { toProductCard } from '@/lib/products';
import {
  addCartItem,
  updateCartItem as updateCartItemAction,
  removeCartItem as removeCartItemAction,
  clearServerCart,
  mergeGuestCart,
} from '@/lib/cart-actions';
import { trackAddToCart } from '@/lib/analytics-actions';

export interface CartItem {
  product: Product;
  quantity: number;
  /** Selected size/option (e.g. "Free Size") when the product offers variants. */
  selected_variant?: ProductVariant;
}

interface CartContextType {
  cart: CartItem[];
  isCartLoading: boolean;
  addToCart: (
    product: Product,
    quantity?: number,
    selected_variant?: ProductVariant
  ) => Promise<{ success: boolean; error?: string }>;
  removeFromCart: (productId: Product['id'], variantValue?: string) => void;
  updateQuantity: (productId: Product['id'], quantity: number, variantValue?: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST_CART_KEY = 'janya_cart';

/** Uniquely identifies a cart line: product + selected variant ("" = none). */
function lineKey(id: Product['id'], variantValue?: string): string {
  return `${String(id)}::${variantValue || ''}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [sessionUser, setSessionUser] = useState<{ id: string } | null>(null);
  const [isCartLoading, setIsCartLoading] = useState(true);

  const saveGuestCart = useCallback((items: CartItem[]) => {
    try {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    } catch {
      // storage unavailable — ignore
    }
  }, []);

  const loadGuestCart = useCallback(() => {
    try {
      const saved = localStorage.getItem(GUEST_CART_KEY);
      if (!saved) {
        setCart([]);
        return;
      }
      const parsed = JSON.parse(saved);
      const items: CartItem[] = Array.isArray(parsed) ? parsed : [];
      setCart(items.filter((i) => i && i.product && typeof i.quantity === 'number'));
    } catch {
      setCart([]);
    }
  }, []);

  const loadServerCart = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: rows, error } = await supabase.from('cart_items').select('product_id, quantity, variant');
      if (error) {
        setCart([]);
        return;
      }
      const ids = (rows || []).map((r: any) => String(r.product_id));
      const items: CartItem[] = [];
      if (ids.length > 0) {
        const { data: products } = await supabase.from('products').select('*').in('id', ids);
        const prodMap = new Map((products || []).map((p: any) => [String(p.id), p]));
        (rows || []).forEach((r: any) => {
          const raw = prodMap.get(String(r.product_id));
          if (!raw) return;
          const variantValue = (r.variant as string) || '';
          items.push({
            product: toProductCard(raw),
            quantity: r.quantity,
            selected_variant: variantValue
              ? { variant_type: 'SIZE', variant_value: variantValue, stock_quantity: 0 }
              : undefined,
          });
        });
      }
      setCart(items);
    } catch {
      setCart([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        setSessionUser(session.user);
        await loadServerCart();
      } else {
        setSessionUser(null);
        loadGuestCart();
      }
      setIsCartLoading(false);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSessionUser(session.user);
        // Merge guest (localStorage) cart into the server cart.
        let guestItems: { productId: string; quantity: number }[] = [];
        try {
          const saved = localStorage.getItem(GUEST_CART_KEY);
          const parsed = saved ? JSON.parse(saved) : [];
          guestItems = (Array.isArray(parsed) ? parsed : [])
            .filter((i: any) => i?.product?.id && typeof i?.quantity === 'number')
            .map((i: any) => ({ productId: String(i.product.id), quantity: i.quantity }));
        } catch {
          guestItems = [];
        }
        if (guestItems.length > 0) {
          await mergeGuestCart(guestItems);
        }
        try {
          localStorage.removeItem(GUEST_CART_KEY);
        } catch {
          // ignore
        }
        await loadServerCart();
      } else if (event === 'SIGNED_OUT') {
        setSessionUser(null);
        setCart([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadGuestCart, loadServerCart]);

  // Persist guest cart changes to localStorage while signed out.
  useEffect(() => {
    if (!sessionUser && !isCartLoading) {
      saveGuestCart(cart);
    }
  }, [cart, sessionUser, isCartLoading, saveGuestCart]);

  const addToCart = useCallback(
    async (
      product: Product,
      quantity = 1,
      selected_variant?: ProductVariant
    ): Promise<{ success: boolean; error?: string }> => {
      const qty = Math.max(1, Math.floor(quantity) || 1);
      const variantValue = selected_variant?.variant_value || '';
      const key = lineKey(product.id, variantValue);
      if (sessionUser) {
        const res = await addCartItem(String(product.id), qty, variantValue);
        if (res.success) {
          await loadServerCart();
          void trackAddToCart(String(product.id), variantValue || undefined).catch(() => {});
          return { success: true };
        }
        return { success: false, error: res.error };
      }

      // Guest: validate against the product snapshot we have.
      const stock = selected_variant ? selected_variant.stock_quantity : product.stock_quantity;
      if (product.in_stock === false || (typeof stock === 'number' && stock <= 0)) {
        return { success: false, error: 'Product is currently out of stock.' };
      }
      const maxQty = typeof stock === 'number' ? stock : Infinity;
      setCart((prev) => {
        const idx = prev.findIndex(
          (i) => lineKey(i.product.id, i.selected_variant?.variant_value) === key
        );
        if (idx > -1) {
          const nextQty = Math.min(prev[idx].quantity + qty, maxQty);
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: nextQty };
          return next;
        }
        return [...prev, { product, quantity: qty, selected_variant }];
      });
      void trackAddToCart(String(product.id), variantValue || undefined).catch(() => {});
      return { success: true };
    },
    [sessionUser, loadServerCart]
  );

  const updateQuantity = useCallback(
    async (productId: Product['id'], quantity: number, variantValue = '') => {
      const qty = Math.max(1, Math.floor(quantity) || 1);
      const key = lineKey(productId, variantValue);
      if (sessionUser) {
        const res = await updateCartItemAction(String(productId), qty, variantValue);
        if (res.success) await loadServerCart();
      } else {
        setCart((prev) =>
          prev.map((i) => {
            if (lineKey(i.product.id, i.selected_variant?.variant_value) !== key) return i;
            const maxStock = i.selected_variant
              ? i.selected_variant.stock_quantity
              : (i.product.stock_quantity ?? Infinity);
            return { ...i, quantity: Math.min(qty, maxStock) };
          })
        );
      }
    },
    [sessionUser, loadServerCart]
  );

  const removeFromCart = useCallback(
    (productId: Product['id'], variantValue = '') => {
      const key = lineKey(productId, variantValue);
      if (sessionUser) {
        removeCartItemAction(String(productId), variantValue).then((res) => {
          if (res.success) loadServerCart();
        });
      } else {
        setCart((prev) =>
          prev.filter((i) => lineKey(i.product.id, i.selected_variant?.variant_value) !== key)
        );
      }
    },
    [sessionUser, loadServerCart]
  );

  const clearCart = useCallback(() => {
    if (sessionUser) {
      clearServerCart().then(() => setCart([]));
    } else {
      setCart([]);
    }
  }, [sessionUser]);

  const cartTotal = cart.reduce((sum, item) => {
    const price = item.product.discount_price || item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
