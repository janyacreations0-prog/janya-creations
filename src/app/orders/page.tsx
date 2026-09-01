import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { NOINDEX_ROBOTS } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = { robots: NOINDEX_ROBOTS };

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/orders');

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, payment_status, status, created_at')
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
            {orders.map((o: any) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="block bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-gray-900">{o.order_number}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(o.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[o.status] || 'text-gray-500 bg-gray-100'}`}>
                        {o.status}
                      </span>
                      {o.payment_gateway === 'cod' ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          Cash on Delivery
                        </span>
                      ) : o.payment_status === 'paid' ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Payment confirmed
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          {o.payment_status === 'pending' ? 'Pending' : 'Failed'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">₹{Number(o.total_amount).toLocaleString()}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}