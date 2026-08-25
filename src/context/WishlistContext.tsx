'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { toProductCard } from '@/lib/products';

interface WishlistContextType {
  wishlist: Product[];
  isWishlistLoading: boolean;
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: Product['id']) => void;
  isInWishlist: (productId: Product['id']) => boolean;
  toggleWishlist: (product: Product) => void;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const GUEST_WISHLIST_KEY = 'janya_wishlist';

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [sessionUser, setSessionUser] = useState<{ id: string } | null>(null);
  const [isWishlistLoading, setIsWishlistLoading] = useState(true);

  const saveGuestWishlist = useCallback((items: Product[]) => {
    try {
      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, []);

  const loadGuestWishlist = useCallback(() => {
    try {
      const saved = localStorage.getItem(GUEST_WISHLIST_KEY);
      if (!saved) {
        setWishlist([]);
        return;
      }
      const parsed = JSON.parse(saved);
      setWishlist(Array.isArray(parsed) ? parsed : []);
    } catch {
      setWishlist([]);
    }
  }, []);

  const loadServerWishlist = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: rows, error } = await supabase.from('wishlist_items').select('product_id');
      if (error) {
        setWishlist([]);
        return;
      }
      const ids = (rows || []).map((r: any) => String(r.product_id));
      const items: Product[] = [];
      if (ids.length > 0) {
        const { data: products } = await supabase.from('products').select('*').in('id', ids);
        (products || []).forEach((p: any) => items.push(toProductCard(p)));
      }
      setWishlist(items);
    } catch {
      setWishlist([]);
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
        await loadServerWishlist();
      } else {
        setSessionUser(null);
        loadGuestWishlist();
      }
      setIsWishlistLoading(false);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setSessionUser(session.user);
        // Merge guest (localStorage) wishlist into the server wishlist.
        let guestIds: string[] = [];
        try {
          const saved = localStorage.getItem(GUEST_WISHLIST_KEY);
          const parsed = saved ? JSON.parse(saved) : [];
          guestIds = (Array.isArray(parsed) ? parsed : [])
            .map((p: any) => (p && (p.id ?? p.product_id)) as string)
            .filter(Boolean);
        } catch {
          guestIds = [];
        }
        if (guestIds.length > 0) {
          await supabase.from('wishlist_items').upsert(
            guestIds.map((product_id) => ({ user_id: session.user!.id, product_id })),
            { onConflict: 'user_id,product_id', ignoreDuplicates: true }
          );
        }
        try {
          localStorage.removeItem(GUEST_WISHLIST_KEY);
        } catch {
          // ignore
        }
        await loadServerWishlist();
      } else if (event === 'SIGNED_OUT') {
        setSessionUser(null);
        setWishlist([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadGuestWishlist, loadServerWishlist]);

  // Persist guest wishlist changes to localStorage while signed out.
  useEffect(() => {
    if (!sessionUser && !isWishlistLoading) {
      saveGuestWishlist(wishlist);
    }
  }, [wishlist, sessionUser, isWishlistLoading, saveGuestWishlist]);

  const addToWishlist = useCallback(
    (product: Product) => {
      const already = wishlist.some((item) => String(item.id) === String(product.id));
      if (already) return;
      if (sessionUser) {
        const supabase = createClient();
        supabase
          .from('wishlist_items')
          .upsert(
            { user_id: sessionUser.id, product_id: String(product.id) },
            { onConflict: 'user_id,product_id', ignoreDuplicates: true }
          )
          .then(() => {
            setWishlist((prev) => [...prev, product]);
          });
      } else {
        setWishlist((prev) => [...prev, product]);
      }
    },
    [sessionUser, wishlist]
  );

  const removeFromWishlist = useCallback(
    (productId: Product['id']) => {
      const id = String(productId);
      if (sessionUser) {
        const supabase = createClient();
        supabase
          .from('wishlist_items')
          .delete()
          .eq('user_id', sessionUser.id)
          .eq('product_id', id)
          .then(() => {
            setWishlist((prev) => prev.filter((item) => String(item.id) !== id));
          });
      } else {
        setWishlist((prev) => prev.filter((item) => String(item.id) !== id));
      }
    },
    [sessionUser]
  );

  const isInWishlist = useCallback(
    (productId: Product['id']) => {
      return wishlist.some((item) => String(item.id) === String(productId));
    },
    [wishlist]
  );

  const toggleWishlist = useCallback(
    (product: Product) => {
      if (isInWishlist(product.id)) {
        removeFromWishlist(product.id);
      } else {
        addToWishlist(product);
      }
    },
    [isInWishlist, addToWishlist, removeFromWishlist]
  );

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isWishlistLoading,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleWishlist,
        wishlistCount: wishlist.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
