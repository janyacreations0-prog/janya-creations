'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase/client';
import { toProductCard } from '@/lib/products';
import { Trash2, ArrowLeft, Home, Minus, Plus } from 'lucide-react';
import type { Product } from '@/types';

export default function CartPage() {
  const router = useRouter();
  const { cart, isCartLoading, removeFromCart, updateQuantity } = useCart();

  // Re-resolve current product data so prices/stock are never stale or
  // client-provided. Snapshots are used only as a fallback while loading.
  const [currentProducts, setCurrentProducts] = useState<Record<string, Product>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let mounted = true;
    const ids = cart.map((item) => String(item.product.id));
    if (ids.length === 0) {
      setCurrentProducts({});
      setLoadingProducts(false);
      return;
    }
    const supabase = createClient();
    (async () => {
      try {
        const { data } = await supabase.from('products').select('*').in('id', ids);
        if (!mounted) return;
        const map: Record<string, Product> = {};
        (data || []).forEach((p: any) => {
          map[String(p.id)] = toProductCard(p);
        });
        setCurrentProducts(map);
      } catch {
        // keep snapshots as fallback
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [cart]);

  const liveProduct = (id: string) => currentProducts[id];

  const subtotal = cart.reduce((sum, item) => {
    const live = liveProduct(String(item.product.id));
    const product = live || item.product;
    const unit = product.discount_price || product.price;
    return sum + (Number.isFinite(unit) ? unit : 0) * item.quantity;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="max-w-4xl mx-auto w-full px-4 py-6 flex-1">
        {/* Navigation Bar (Back & Home Buttons) */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-rose-600 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-rose-600 transition-colors bg-white hover:bg-rose-50 px-3.5 py-1.5 rounded-full border border-gray-200 shadow-sm"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>

        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6">Your Shopping Cart</h1>

        {isCartLoading || loadingProducts ? (
          <div className="text-center py-16 text-gray-400">Loading your cart...</div>
        ) : cart.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-lg border border-gray-200 space-y-4 shadow-sm">
            <p className="text-gray-500">Your cart is currently empty.</p>
            <Link
              href="/"
              className="inline-block bg-rose-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              {cart.map((item) => {
                const live = liveProduct(String(item.product.id));
                const product = live || item.product;
                const isUnavailable = !live;
                const stock = typeof product.stock_quantity === 'number' ? product.stock_quantity : null;
                const outOfStock = stock !== null && stock <= 0;
                const stockReduced = stock !== null && item.quantity > stock;
                const unitPrice = product.discount_price || product.price;
                const lineTotal = (Number.isFinite(unitPrice) ? unitPrice : 0) * item.quantity;

                return (
                  <div
                    key={item.product.id}
                    className="bg-white p-4 rounded-lg border border-gray-200 flex items-start justify-between gap-4 shadow-sm"
                  >
                    <div className="flex items-start space-x-4 min-w-0">
                      <img
                        src={product.images?.[0] || 'https://via.placeholder.com/80'}
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <Link href={`/products/${product.id}`}>
                          <h3 className="font-medium text-sm text-gray-900 line-clamp-1 hover:text-rose-600">
                            {product.title}
                          </h3>
                        </Link>

                        {isUnavailable ? (
                          <p className="text-xs font-semibold text-rose-600 mt-1">
                            Product unavailable
                          </p>
                        ) : outOfStock ? (
                          <p className="text-xs font-semibold text-rose-600 mt-1">
                            Out of stock
                          </p>
                        ) : stockReduced ? (
                          <p className="text-xs font-semibold text-amber-600 mt-1">
                            Only {stock} left — quantity limited to {stock}
                          </p>
                        ) : null}

                        <p className="text-sm font-bold text-gray-900 mt-1">
                          ₹{Number.isFinite(unitPrice) ? unitPrice : item.product.price}
                        </p>

                        {!isUnavailable && !outOfStock && (
                          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden mt-2 w-fit">
                            <button
                              onClick={() => updateQuantity(String(product.id), item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={stock ?? undefined}
                              value={item.quantity}
                              onChange={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (Number.isFinite(v) && v >= 1) {
                                  updateQuantity(String(product.id), v);
                                }
                              }}
                              className="w-12 text-center text-sm font-semibold text-gray-900 focus:outline-none"
                              aria-label="Quantity"
                            />
                            <button
                              onClick={() => updateQuantity(String(product.id), item.quantity + 1)}
                              disabled={stock !== null && item.quantity >= stock}
                              className="px-2.5 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">₹{lineTotal}</p>
                      <button
                        onClick={() => removeFromCart(String(item.product.id))}
                        className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 h-fit space-y-4 shadow-sm">
              <h2 className="text-lg font-serif font-bold text-gray-900 border-b pb-3">
                Order Summary
              </h2>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600 font-bold">FREE</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-base text-gray-900">
                <span>Total</span>
                <span>₹{subtotal}</span>
              </div>

              <Link
                href="/checkout"
                className="block text-center w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-sm"
              >
                Proceed to Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
