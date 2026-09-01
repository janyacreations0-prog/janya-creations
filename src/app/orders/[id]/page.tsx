import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CheckCircle2, Package, ArrowLeft } from 'lucide-react';
import { NOINDEX_ROBOTS } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = { robots: NOINDEX_ROBOTS };

interface OrderDetailProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}

export default async function OrderDetailPage({ params, searchParams }: OrderDetailProps) {
  const { id } = await params;
  const { placed } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/orders');

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  // RLS guarantees only the owner's order can be read; anything else 404s.
  if (!order || String(order.user_id) !== String(user.id)) {
    notFound();
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: true });

  const address = order.shipping_address as any;
  const statusColors: Record<string, string> = {
    pending: 'text-amber-700 bg-amber-50',
    confirmed: 'text-blue-700 bg-blue-50',
    processing: 'text-indigo-700 bg-indigo-50',
    shipped: 'text-purple-700 bg-purple-50',
    delivered: 'text-emerald-700 bg-emerald-50',
    cancelled: 'text-gray-500 bg-gray-100',
    refunded: 'text-rose-700 bg-rose-50',
  };

  const isCod = order.payment_gateway === 'cod' && order.status === 'confirmed';

  const paymentStatusColors: Record<string, string> = {
    paid: 'text-emerald-700 bg-emerald-50',
    pending: 'text-amber-700 bg-amber-50',
    failed: 'text-rose-700 bg-rose-50',
    refunded: 'text-rose-700 bg-rose-50',
  };

  const paymentStatusLabel: Record<string, string> = {
    paid: 'Payment confirmed',
    pending: isCod ? 'Cash on Delivery' : 'Payment is being confirmed',
    failed: 'Payment failed',
    refunded: 'Payment refunded',
  };

  const paid = order.payment_status === 'paid';
  const pendingPayment = order.payment_status === 'pending' && !isCod;
  const failedPayment = order.payment_status === 'failed';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-rose-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> My Orders
        </Link>

        {isCod && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h1 className="text-2xl font-serif font-bold text-gray-900">Order placed successfully!</h1>
            <p className="text-sm text-gray-600 mt-2">
              <strong>Payment method:</strong> Cash on Delivery<br/>
              <strong>Amount payable on delivery:</strong> ₹{Number(order.total_amount).toLocaleString('en-IN')}
            </p>
          </div>
        )}

        {paid && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h1 className="text-2xl font-serif font-bold text-gray-900">Order placed successfully!</h1>
            <p className="text-sm text-gray-600 mt-2">
              Your payment has been confirmed. Thank you for your order. Your order number is{' '}
              <span className="font-bold text-gray-900">{order.order_number}</span>.
            </p>
          </div>
        )}

        {pendingPayment && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <h1 className="text-2xl font-serif font-bold text-gray-900">Payment is being confirmed</h1>
            <p className="text-sm text-gray-600 mt-2">
              We have received your order. Your payment is being securely verified. Please don&apos;t make
              another payment. You will receive a confirmation email shortly.
            </p>
          </div>
        )}

        {failedPayment && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
            <h1 className="text-2xl font-serif font-bold text-gray-900">Payment failed</h1>
            <p className="text-sm text-gray-600 mt-2">
              Your payment was not completed. You can{' '}
              <Link href="/shop" className="text-rose-600 font-semibold hover:text-rose-700">
                browse our collection
              </Link>{' '}
              and try again. If you were charged, we will refund you automatically.
            </p>
          </div>
        )}

        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-1">Order {order.order_number}</h1>
        <p className="text-sm text-gray-500 mb-6">
          Placed on{' '}
          {new Date(order.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${statusColors[order.status] || 'text-gray-500 bg-gray-100'}`}>
            {order.status}
          </span>
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${paymentStatusColors[order.payment_status] || 'text-gray-600 bg-gray-100'}`}>
            {paymentStatusLabel[order.payment_status] || order.payment_status}
          </span>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-rose-600" /> Items
          </h2>
          <div className="space-y-4">
            {(items || []).map((item: any) => (
              <div key={item.id} className="flex items-center gap-3">
                {item.product_image ? (
                  <img src={item.product_image} alt={item.product_name} className="w-16 h-16 object-cover rounded-md" />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-300 text-xs">No image</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.product_name}</p>
                  <p className="text-xs text-gray-500">Qty {item.quantity} × ₹{Number(item.unit_price).toLocaleString()}</p>
                </div>
                <p className="text-sm font-bold text-gray-900">₹{Number(item.line_total).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{Number(order.subtotal).toLocaleString()}</span></div>
          <div className="flex justify-between text-gray-600"><span>Shipping</span><span className="text-green-600 font-bold">FREE</span></div>
          <div className="border-t pt-2 flex justify-between font-bold text-gray-900"><span>Total</span><span>₹{Number(order.total_amount).toLocaleString()}</span></div>
        </div>

        {/* Shipping address */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Shipping Address</h2>
          <p className="text-sm text-gray-700">{order.customer_name}</p>
          <p className="text-sm text-gray-600">{address?.line1}{address?.line2 ? `, ${address.line2}` : ''}</p>
          <p className="text-sm text-gray-600">{address?.city}, {address?.state} — {address?.pincode}</p>
          <p className="text-sm text-gray-600">{address?.country}</p>
          <p className="text-sm text-gray-600 mt-1">Phone: {order.customer_phone}</p>
        </div>

        <div className="text-center">
          <Link href="/shop" className="inline-block bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-8 py-3 rounded-lg transition-colors">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}