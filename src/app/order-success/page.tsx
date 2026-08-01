'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
// ❌ REMOVED: import Navbar from '@/components/navbar/Navbar';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || 'JANYA-SUCCESS';
  const method = searchParams.get('method') || 'COD';

  return (
    <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-xl border border-gray-100 shadow-sm text-center space-y-4">
      <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
        ✓
      </div>
      <h1 className="text-2xl font-serif font-bold text-gray-900">Order Confirmed!</h1>
      <p className="text-sm text-gray-600">
        Thank you for shopping with us. Your order <span className="font-mono font-bold text-gray-900">#{orderId}</span> has been placed successfully via <span className="uppercase font-semibold">{method}</span>.
      </p>
      <div className="pt-4">
        <Link
          href="/"
          className="inline-block bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-lg transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    // ✅ REMOVED: <Navbar />
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Suspense fallback={<div className="text-center p-12">Loading order details...</div>}>
        <OrderSuccessContent />
      </Suspense>
      {/* ✅ NO footer here - layout.tsx provides it */}
    </div>
  );
}