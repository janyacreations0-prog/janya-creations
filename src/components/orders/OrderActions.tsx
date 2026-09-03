'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { buyAgainOrder } from '@/lib/cart-actions';
import { RefreshCw, CreditCard } from 'lucide-react';

/**
 * Customer order actions row:
 *  - "Buy Again": re-adds currently-available items from this order to the cart
 *    for a NEW purchase (never reuses the old order/payment). Goes to the cart
 *    so the customer completes a fresh checkout.
 *  - "Pay Now": shown for unpaid COD orders — deep-links to the secure per-order
 *    Cashfree payment page (/orders/{id}/pay).
 */
export default function OrderActions({
  orderId,
  isCod,
  isPaid,
  isCancelled,
  hasItems,
}: {
  orderId: string;
  isCod: boolean;
  isPaid: boolean;
  isCancelled: boolean;
  hasItems: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const showBuyAgain = hasItems && !busy;
  const showPayNow = isCod && !isPaid && !isCancelled;

  const handleBuyAgain = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const res = await buyAgainOrder(orderId);
    if (!res.success) {
      setError(res.error || 'Unable to re-add items. Please try again.');
      setBusy(false);
      return;
    }
    if (res.unavailable.length > 0) {
      setNotice(
        res.added > 0
          ? 'Some items from this order are no longer available. Available items have been added to your cart.'
          : 'None of the items from this order are currently available.'
      );
      setBusy(false);
      return;
    }
    router.push('/cart');
    setTimeout(() => setBusy(false), 800);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {showBuyAgain && (
          <button
            type="button"
            onClick={handleBuyAgain}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
            {busy ? 'Adding items...' : 'Buy Again'}
          </button>
        )}
        {showPayNow && (
          <Link
            href={`/orders/${orderId}/pay`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 text-sm font-semibold rounded-lg border border-rose-300 transition-colors"
          >
            <CreditCard className="w-4 h-4" /> Pay Now
          </Link>
        )}
      </div>
      {error && <p className="text-xs text-rose-700">{error}</p>}
      {notice && (
        <p className="text-xs text-gray-600">
          {notice}{' '}
          <Link href="/cart" className="text-rose-600 font-semibold underline">
            View cart
          </Link>
        </p>
      )}
    </div>
  );
}
