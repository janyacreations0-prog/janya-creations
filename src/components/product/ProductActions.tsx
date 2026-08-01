'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { Product } from '@/types';
import { Heart } from 'lucide-react';

interface ProductActionsProps {
  product: Product;
}

export default function ProductActions({ product }: ProductActionsProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [added, setAdded] = useState(false);
  const isWishlisted = isInWishlist(product.id);

  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleBuyNow = () => {
    addToCart(product);
    router.push('/checkout');
  };

  return (
    <div className="pt-4 space-y-3">
      {added && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-all">
          <span>✓ Added to bag successfully!</span>
          <button onClick={() => router.push('/cart')} className="underline hover:text-emerald-900">
            View Bag
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleAddToCart}
          className="flex-1 bg-white hover:bg-rose-50 border border-rose-600 text-rose-600 font-bold py-3.5 px-6 rounded-lg transition-colors shadow-sm text-sm"
        >
          {added ? 'ADDED!' : 'ADD TO BAG'}
        </button>
        <button
          onClick={handleBuyNow}
          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-3.5 px-6 rounded-lg transition-colors shadow-sm text-sm"
        >
          BUY NOW
        </button>
      </div>

      {/* Connected Wishlist Button */}
      <button
        type="button"
        onClick={() => toggleWishlist(product)}
        className={`w-full py-3 px-6 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
          isWishlisted
            ? 'bg-rose-50 border-rose-600 text-rose-600 font-semibold'
            : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-800'
        }`}
      >
        <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-rose-600 text-rose-600' : ''}`} />
        {isWishlisted ? 'WISHLISTED' : 'ADD TO WISHLIST'}
      </button>
    </div>
  );
}