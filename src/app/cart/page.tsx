'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
// ❌ REMOVED: import Navbar from '@/components/navbar/Navbar';
import { Trash2, ArrowLeft, Home } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const { cart, removeFromCart, cartTotal } = useCart();

  return (
    // ✅ REMOVED: <Navbar />
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

        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6">Your Shopping Bag</h1>

        {cart.length === 0 ? (
          <div className="bg-white p-8 text-center rounded-lg border border-gray-200 space-y-4 shadow-sm">
            <p className="text-gray-500">Your bag is currently empty.</p>
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
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center space-x-4">
                    <img
                      src={item.product.images?.[0] || 'https://via.placeholder.com/80'}
                      alt={item.product.title}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                    <div>
                      <h3 className="font-medium text-sm text-gray-900 line-clamp-1">
                        {item.product.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">
                        ₹{(item.product.discount_price || item.product.price) * item.quantity}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 h-fit space-y-4 shadow-sm">
              <h2 className="text-lg font-serif font-bold text-gray-900 border-b pb-3">
                Order Summary
              </h2>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">₹{cartTotal}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600 font-bold">FREE</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-base text-gray-900">
                <span>Total</span>
                <span>₹{cartTotal}</span>
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
      {/* ✅ NO footer here - layout.tsx provides it */}
    </div>
  );
}