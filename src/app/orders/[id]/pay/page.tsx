'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { payOrderOnline } from '@/lib/order-actions';
import { Lock } from 'lucide-react';

export default function PayOrderPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id || '';

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState<{
    orderNumber: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) {
        setError('Please sign in to pay for your order.');
        setLoading(false);
        return;
      }
      setLoading(false);
    });
  }, []);

  const startPayment = async () => {
    if (!orderId) return;
    setStarting(true);
    setError('');
    const result = await payOrderOnline(orderId);
    if (!result.success || !result.order) {
      setError(result.error || 'Unable to start secure payment. Please try again.');
      setStarting(false);
      return;
    }
    const order = result.order;
    setInfo({ orderNumber: order.order_number, amount: order.amount });

    // Open Cashfree Hosted Checkout for this exact order.
    try {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      script.onload = () => {
        const cashfree = (window as any).Cashfree({ mode: order.cashfreeMode || 'sandbox' });
        cashfree.checkout({
          paymentSessionId: order.paymentSessionId,
          redirectTarget: '_self',
        });
      };
      document.body.appendChild(script);
    } catch {
      setError('Payment gateway could not be loaded. Please try again.');
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-12">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-serif font-bold text-gray-900">Pay for your order</h1>
          <p className="text-sm text-gray-500">
            {info
              ? `Order ${info.orderNumber} — ₹${info.amount.toLocaleString('en-IN')}`
              : 'Securely pay for your order online.'}
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
          )}

          {!info && !error && (
            <button
              type="button"
              onClick={startPayment}
              disabled={starting}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg transition-colors"
            >
              {starting ? 'Opening secure payment...' : 'Proceed to Secure Payment'}
            </button>
          )}

          {error && !info && (
            <Link
              href="/orders"
              className="inline-block w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-lg transition-colors"
            >
              Back to My Orders
            </Link>
          )}

          <p className="text-xs text-gray-400">
            Secure payment processing by our payment provider.
          </p>
        </div>
      </div>
    </div>
  );
}
