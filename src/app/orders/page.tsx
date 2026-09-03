import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { NOINDEX_ROBOTS } from '@/lib/seo';
import OrderActions from '@/components/orders/OrderActions';
import type { Metadata } from 'next';

export const metadata: Metadata = { robots: NOINDEX_ROBOTS };

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/orders');

  // Include the most recent item thumbnail + gateway for each order card.
  const { data: orders } = await supabase
    .from('orders')
    .select(
      'id, order_number, total_amount, payment_status, status, payment_gateway, created_at, ' +
        'order_items(product_id, product_name, product_image, quantity)'
    )
    .order('created_at', { ascending: false });

  const statusColors: Record<string, string> = {
    pending: 'text-amber-700 bg-amber-50',
    confirmed: 'text-blue-700 bg-blue-50',
    processing: 'text-indigo-700 bg-indigo-50',
    shipped: 'text-purple-700 bg-purple-50',
    delivered: 'text-emerald-700 bg-emerald-50',
    cancelled: 'text-gray-500 bg-gray-100',
    refunded: 'text-rose-700 bg-rose-50',
  };

  const statusLabel: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-rose-600" /> My Orders
        </h1>

        {!orders || orders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">You haven&apos;t placed any orders yet.</p>
            <Link
              href="/shop"
              className="inline-block mt-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o: any) => {
              const isCod = o.payment_gateway === 'cod';
              const isPaid = o.payment_status === 'paid';
              const isCancelled = o.status === 'cancelled';
              const items = o.order_items || [];
              const first = items[0];
              const totalItems = items.reduce((n: number, i: any) => n + (i.quantity || 1), 0);
              return (
                <div
                  key={o.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5"
                >
                  <div className="flex items-center gap-3">
                    {first?.product_image ? (
                      <Link href={`/orders/${o.id}`} aria-label="View order">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={first.product_image}
                          alt={first.product_name || 'Order item'}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-100"
                        />
                      </Link>
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 text-xs shrink-0">
                        No image
                      </div>
                    )}
                    <Link href={`/orders/${o.id}`} className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{o.order_number}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(o.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {totalItems > 1 ? ` · ${totalItems} items` : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[o.status] || 'text-gray-500 bg-gray-100'}`}>
                          {statusLabel[o.status] || o.status}
                        </span>
                        {isCod ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            Cash on Delivery
                          </span>
                        ) : o.payment_status === 'paid' ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Payment confirmed
                          </span>
                        ) : o.payment_status === 'refunded' ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                            Refunded
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            {o.payment_status === 'pending' ? 'Pending' : 'Failed'}
                          </span>
                        )}
                      </div>
                    </Link>
                    <span className="text-sm font-bold text-gray-900">₹{Number(o.total_amount).toLocaleString()}</span>
                    <Link href={`/orders/${o.id}`} className="text-gray-300 hover:text-rose-500">
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </div>
                  {!isCancelled && (
                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <OrderActions
                        orderId={o.id}
                        isCod={isCod}
                        isPaid={isPaid}
                        isCancelled={isCancelled}
                        hasItems={items.length > 0}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
