import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { CheckCircle2, Package, ArrowLeft } from 'lucide-react';
import { NOINDEX_ROBOTS } from '@/lib/seo';
import OrderActions from '@/components/orders/OrderActions';
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

  const isCod = order.payment_gateway === 'cod';
  const isOnline = !isCod;

  const paymentStatusColors: Record<string, string> = {
    paid: 'text-emerald-700 bg-emerald-50',
    pending: isCod ? 'text-amber-700 bg-amber-50' : 'text-amber-700 bg-amber-50',
    failed: 'text-rose-700 bg-rose-50',
    refunded: 'text-rose-700 bg-rose-50',
  };

  const paymentStatusLabel: Record<string, string> = {
    paid: isCod ? 'Paid on Delivery' : 'Payment confirmed',
    pending: isCod ? 'Cash on Delivery' : 'Payment pending',
    failed: 'Payment failed',
    refunded: 'Payment refunded',
  };

  const paid = order.payment_status === 'paid';
  const refunded = order.payment_status === 'refunded' || order.status === 'refunded';
  const cancelled = order.status === 'cancelled';
  const delivered = order.status === 'delivered';
  const shipped = order.status === 'shipped';
  const processing = order.status === 'processing';
  const confirmed = order.status === 'confirmed';
  const pendingFulfilment = order.status === 'pending';
  const onlinePaymentPending = isOnline && order.payment_status === 'pending';
  const failedPayment = order.payment_status === 'failed';
  const amountDue = Number(order.total_amount).toLocaleString('en-IN');

  // Human labels for fulfilment status badges
  const statusLabel: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };

  /** Deterministic customer banner state from fulfilment + payment + gateway. */
  function banner(): {
    title: string;
    message: string;
    tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral';
    icon?: boolean;
  } {
    if (cancelled) {
      return {
        title: 'Order cancelled',
        message: isCod
          ? `Order ${order.order_number} has been cancelled. No amount is due.`
          : paid || refunded
            ? `Order ${order.order_number} has been cancelled. Your payment will be refunded if applicable.`
            : `Order ${order.order_number} has been cancelled. No payment was made.`,
        tone: 'neutral',
      };
    }
    if (refunded) {
      return {
        title: 'Payment refunded',
        message: `The payment for order ${order.order_number} has been refunded. If you don't see it yet, please allow a few days.`,
        tone: 'danger',
      };
    }
    if (delivered) {
      return {
        title: 'Order delivered',
        message: isCod
          ? `Thank you for your order! Please pay ₹${amountDue} by Cash on Delivery if you haven't already.`
          : `Thank you for your order! Your items have been delivered.`,
        tone: 'success',
        icon: true,
      };
    }
    if (shipped) {
      return {
        title: 'Order shipped',
        message: isCod
          ? `Your order is on its way. Keep ₹${amountDue} ready to pay by Cash on Delivery when it arrives.`
          : `Your order is on its way and should arrive soon.`,
        tone: 'info',
      };
    }
    if (processing) {
      return {
        title: 'Order being processed',
        message: isCod
          ? `We are carefully packing your order. You will pay ₹${amountDue} by Cash on Delivery.`
          : `We are carefully packing your order for dispatch.`,
        tone: 'info',
      };
    }
    if (confirmed) {
      return {
        title: isCod ? 'Order confirmed' : paid ? 'Order confirmed' : 'Order confirmed',
        message: isCod
          ? `Your order has been successfully placed with Cash on Delivery. Amount payable on delivery: ₹${amountDue}. You do not need to make any payment now.`
          : paid
            ? `Your payment has been confirmed. Thank you for your order ${order.order_number}.`
            : `We have received your order ${order.order_number}.`,
        tone: 'success',
        icon: paid || isCod,
      };
    }
    if (pendingFulfilment) {
      return {
        title: isCod ? 'Order placed' : onlinePaymentPending ? 'Awaiting payment' : 'Order placed',
        message: isCod
          ? `Your order with Cash on Delivery is being prepared. Amount payable on delivery: ₹${amountDue}.`
          : onlinePaymentPending
            ? `We have received your order. Please complete your payment to confirm it.`
            : `We have received your order ${order.order_number}.`,
        tone: 'info',
      };
    }
    if (failedPayment) {
      return {
        title: 'Payment failed',
        message: `Your payment for order ${order.order_number} could not be completed. No amount has been charged.`,
        tone: 'danger',
      };
    }
    // fallback
    return {
      title: `Order ${statusLabel[order.status] || order.status}`,
      message: `Order ${order.order_number}.`,
      tone: 'info',
    };
  }

  const b = banner();

  const toneBox: Record<string, string> = {
    success: 'bg-emerald-50 border-emerald-200',
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-rose-50 border-rose-200',
    neutral: 'bg-gray-50 border-gray-200',
  };
  const toneText: Record<string, string> = {
    success: 'text-emerald-900',
    info: 'text-blue-900',
    warning: 'text-amber-900',
    danger: 'text-rose-900',
    neutral: 'text-gray-800',
  };
  const toneIcon: Record<string, string> = {
    success: 'text-emerald-600',
    info: 'text-blue-600',
    warning: 'text-amber-600',
    danger: 'text-rose-600',
    neutral: 'text-gray-500',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-rose-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> My Orders
        </Link>

        {/* Status banner */}
        <div className={`mb-6 ${toneBox[b.tone]} border rounded-xl p-6 text-center`}>
          {b.icon && (
            <CheckCircle2 className={`w-12 h-12 ${toneIcon[b.tone]} mx-auto mb-3`} />
          )}
          <h1 className={`text-2xl font-serif font-bold ${toneText[b.tone]}`}>{b.title}</h1>
          <p className="text-sm mt-2 text-gray-600">{b.message}</p>
        </div>

        <h1 className="text-2xl font-serif font-bold text-gray-900 mb-1">Order {order.order_number}</h1>
        <p className="text-sm text-gray-500 mb-4">
          Placed on{' '}
          {new Date(order.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${statusColors[order.status] || 'text-gray-500 bg-gray-100'}`}>
            {statusLabel[order.status] || order.status}
          </span>
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${paymentStatusColors[order.payment_status] || 'text-gray-600 bg-gray-100'}`}>
            {paymentStatusLabel[order.payment_status] || order.payment_status}
          </span>
          <div className="w-full" />
          <OrderActions
            orderId={order.id}
            isCod={isCod}
            isPaid={paid}
            isCancelled={cancelled}
            hasItems={Boolean(items && items.length)}
          />
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-rose-600" /> Items
          </h2>
          <div className="space-y-4">
            {(items || []).map((item: any) => {
              const linkTarget = item.product_id ? `/products/${item.product_id}` : null;
              const image = item.product_image ? (
                <img src={item.product_image} alt={item.product_name} className="w-16 h-16 object-cover rounded-md" />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center text-gray-300 text-xs">No image</div>
              );
              return (
                <div key={item.id} className="flex items-center gap-3">
                  {linkTarget ? <Link href={linkTarget}>{image}</Link> : image}
                  <div className="min-w-0 flex-1">
                    {linkTarget ? (
                      <Link href={linkTarget} className="text-sm font-medium text-gray-900 line-clamp-1 hover:text-rose-600">
                        {item.product_name}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.product_name}</p>
                    )}
                    <p className="text-xs text-gray-500">Qty {item.quantity} × ₹{Number(item.unit_price).toLocaleString()}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">₹{Number(item.line_total).toLocaleString()}</p>
                </div>
              );
            })}
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