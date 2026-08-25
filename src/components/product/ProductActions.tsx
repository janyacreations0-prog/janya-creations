'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Product } from '@/types';
import { Heart, Minus, Plus } from 'lucide-react';

interface ProductActionsProps {
  product: Product;
}

export default function ProductActions({ product }: ProductActionsProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  const isWishlisted = isInWishlist(product.id);
  const stock = typeof product.stock_quantity === 'number' ? product.stock_quantity : 0;
  const outOfStock = !product.in_stock || stock <= 0;

  const changeQuantity = (delta: number) => {
    setQuantity((q) => {
      const next = Math.max(1, q + delta);
      return stock > 0 ? Math.min(next, stock) : next;
    });
  };

  const handleAddToCart = async () => {
    if (outOfStock) return;
    setError('');
    const res = await addToCart(product, quantity);
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
      ) : stock <= 10 ? (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
          In stock — only {stock} left
        </p>
      ) : (
        <p className="text-xs text-emerald-700">In stock</p>
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
            disabled={!outOfStock && stock > 0 ? quantity >= stock : false}
            className="px-3 py-3 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-sm text-sm"
        >
          {added ? 'ADDED!' : 'ADD TO CART'}
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
    </div>
  );
}
