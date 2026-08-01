'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// ❌ REMOVED: import Navbar from '@/components/navbar/Navbar';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { Heart, Trash2, ShoppingBag, ArrowLeft, Home } from 'lucide-react';

export default function WishlistPage() {
  const router = useRouter();
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    // ✅ REMOVED: <Navbar />
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="max-w-5xl mx-auto w-full px-4 py-6 flex-1">
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

        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-600 fill-rose-600" />
          My Wishlist ({wishlist.length})
        </h1>

        {wishlist.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Your wishlist is empty</h2>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Save items you love to your wishlist and revisit them anytime.
            </p>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-block bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-lg transition-colors shadow-sm"
              >
                Explore Jewellery
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {wishlist.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative flex flex-col"
              >
                <div className="aspect-square relative bg-gray-50">
                  <img
                    src={product.images?.[0] || 'https://via.placeholder.com/300'}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white text-gray-600 hover:text-rose-600 rounded-full backdrop-blur-sm transition-colors shadow-sm"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 flex flex-col flex-1 justify-between space-y-3">
                  <div>
                    <h3 className="font-serif font-bold text-gray-900 text-sm line-clamp-1">
                      {product.title}
                    </h3>
                    <p className="text-rose-600 font-bold text-sm mt-1">₹{product.price}</p>
                  </div>

                  <button
                    onClick={() => addToCart(product)}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" /> Move to Bag
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* ✅ NO footer here - layout.tsx provides it */}
    </div>
  );
}