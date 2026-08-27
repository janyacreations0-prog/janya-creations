'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Product, ProductVariant } from '@/types';
import { Heart, Minus, Plus, Ruler, X, Loader2 } from 'lucide-react';
import { defaultSizeOption } from '@/lib/sizes';

interface ProductActionsProps {
  product: Product;
}

export default function ProductActions({ product }: ProductActionsProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const sizes = product.sizes ?? [];
  const hasVariants = sizes.length > 0;

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);

  const isWishlisted = isInWishlist(product.id);

  // Seed the size selection when the product changes (default = first in-stock size).
  useEffect(() => {
    const opt = defaultSizeOption(sizes);
    setSelectedVariant(
      opt ? { variant_type: 'SIZE', variant_value: opt.value, stock_quantity: opt.stock } : null
    );
    setQuantity(1);
    setError('');
    setAdded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const baseStock = typeof product.stock_quantity === 'number' ? product.stock_quantity : 0;
  const selectedStock = selectedVariant ? selectedVariant.stock_quantity : baseStock;
  const anyStock = hasVariants ? sizes.some((s) => s.stock > 0) : baseStock > 0;
  const outOfStock = !product.in_stock || !anyStock;
  const selectedOutOfStock = hasVariants && selectedVariant ? selectedVariant.stock_quantity <= 0 : false;

  const changeQuantity = (delta: number) => {
    setQuantity((q) => {
      const next = Math.max(1, q + delta);
      return selectedStock > 0 ? Math.min(next, selectedStock) : next;
    });
  };

  const handleAddToCart = async () => {
    if (outOfStock || selectedOutOfStock || adding) return;
    setError('');
    setAdding(true);
    const res = await addToCart(product, quantity, selectedVariant ?? undefined);
    setAdding(false);
    if (res.success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } else {
      setError(res.error || 'Unable to add to cart. Please try again.');
    }
  };

  return (
    <div className="pt-4 space-y-3">
      {/* Stock availability */}
      {outOfStock ? (
        <p className="text-sm font-semibold text-rose-600">Currently out of stock</p>
      ) : hasVariants && selectedVariant && selectedStock <= 10 ? (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
          In stock — only {selectedStock} left in {selectedVariant.variant_value}
        </p>
      ) : !hasVariants && baseStock <= 10 ? (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
          In stock — only {baseStock} left
        </p>
      ) : (
        <p className="text-xs text-emerald-700">In stock</p>
      )}

      {/* Size / option selector (only when the product offers variants) */}
      {hasVariants && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Select Size</p>
            <button
              type="button"
              onClick={() => setSizeChartOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded"
              aria-label="Open size chart"
            >
              <Ruler className="w-3.5 h-3.5" /> Size Chart
            </button>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select size">
            {sizes.map((s) => {
              const active = selectedVariant?.variant_value === s.value;
              const unavailable = s.stock <= 0;
              return (
                <button
                  key={s.value}
                  type="button"
                  disabled={unavailable}
                  onClick={() =>
                    setSelectedVariant({
                      variant_type: 'SIZE',
                      variant_value: s.value,
                      stock_quantity: s.stock,
                    })
                  }
                  aria-pressed={active}
                  title={unavailable ? `${s.value} — out of stock` : `${s.value} (${s.stock} in stock)`}
                  className={`px-4 py-2 rounded-lg border text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                    active
                      ? 'border-rose-600 bg-rose-600 text-white'
                      : unavailable
                        ? 'border-gray-200 text-gray-300 line-through cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 hover:border-rose-400'
                  }`}
                >
                  {s.value}
                </button>
              );
            })}
          </div>
          {selectedVariant && (
            <p className="text-[11px] text-gray-400 mt-1.5">
              {selectedVariant.variant_value} — {selectedVariant.stock_quantity} in stock
            </p>
          )}
        </div>
      )}

      {added && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all">
          <span>✓ Added to cart successfully!</span>
          <button onClick={() => router.push('/cart')} className="underline hover:text-emerald-900">
            View Cart
          </button>
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {/* Quantity + Add to Cart */}
      <div className="flex gap-3">
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => changeQuantity(-1)}
            disabled={quantity <= 1}
            className="px-3 py-3 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-10 text-center text-sm font-bold text-gray-900" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => changeQuantity(1)}
            disabled={selectedStock > 0 ? quantity >= selectedStock : false}
            className="px-3 py-3 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={outOfStock || selectedOutOfStock || adding}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1"
        >
          {adding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> ADDING...
            </>
          ) : added ? (
            'ADDED!'
          ) : (
            'ADD TO CART'
          )}
        </button>
      </div>

      {/* Wishlist Button */}
      <button
        type="button"
        onClick={() => toggleWishlist(product)}
        className={`w-full py-3 px-6 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          isWishlisted
            ? 'bg-rose-50 border-rose-600 text-rose-600 font-semibold'
            : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800'
        }`}
        aria-pressed={isWishlisted}
      >
        <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
        {isWishlisted ? 'WISHLISTED' : 'ADD TO WISHLIST'}
      </button>

      {/* Size Chart modal — shows ONLY the product's real sizes & stock */}
      {sizeChartOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="size-chart-title"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSizeChartOpen(false)}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 id="size-chart-title" className="text-sm font-bold text-gray-900">
                Size Chart
              </h3>
              <button
                type="button"
                onClick={() => setSizeChartOpen(false)}
                aria-label="Close size chart"
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-gray-500 mb-3">
                Available sizes for this product:
              </p>
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                <div className="grid grid-cols-2 bg-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <div className="px-4 py-2">Size</div>
                  <div className="px-4 py-2">Stock</div>
                </div>
                {sizes.map((s, i) => (
                  <div
                    key={s.value}
                    className={`grid grid-cols-2 text-xs ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <div className="px-4 py-2 font-medium text-gray-800">{s.value}</div>
                    <div className={`px-4 py-2 ${s.stock > 0 ? 'text-gray-600' : 'text-rose-600 font-semibold'}`}>
                      {s.stock > 0 ? `${s.stock} in stock` : 'Out of stock'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
