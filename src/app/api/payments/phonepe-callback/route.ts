import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validatePhonePeCallback } from '@/lib/payments';
import { notifyPaymentSuccess, notifyPaymentFailed } from '@/lib/email';

/**
 * PhonePe Standard Checkout callback.
 *
 * PhonePe POSTs the payment result to our redirectUrl with a Basic-auth
 * header (dashboard-configured callback username/password). The callback is
 * validated here and the order is confirmed ONLY after:
 *   1. callback authenticity (Basic auth)
 *   2. merchantOrderId matches our local order
 *   3. amount matches our server-calculated total (paise)
 *   4. state === 'COMPLETED'
 *
 * Browser redirects alone never mark an order paid. confirm_order_payment is
 * idempotent (no double stock decrement / no duplicate emails). The customer's
 * browser follows the 302 to their order page.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const authorization = request.headers.get('authorization');

  const payload = validatePhonePeCallback(authorization, body);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid callback' }, { status: 400 });
  }

  const merchantOrderId = payload.merchantOrderId;
  if (!merchantOrderId) {
    return NextResponse.json({ error: 'Missing order reference' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from('orders')
    .select('id, order_number, total_amount, payment_status')
    .eq('order_number', merchantOrderId)
    .maybeSingle();

  if (!order) {
    console.error('[phonepe] callback for unknown order number', merchantOrderId);
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Amount must match the server-calculated total (paise comparison).
  const expectedPaise = Math.round(Number(order.total_amount) * 100);
  if (payload.amount !== expectedPaise) {
    console.error(
      `[phonepe] amount mismatch for ${order.order_number}: expected ${expectedPaise}, got ${payload.amount}`
    );
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
  }

  if (payload.state === 'COMPLETED') {
    // Trusted, idempotent confirmation: marks paid, decrements stock once,
    // clears cart, sends payment-success email once.
    await admin.rpc('confirm_order_payment', {
      p_order_id: order.id,
      p_gateway: 'phonepe',
      p_gateway_payment_id: payload.orderId,
    });
    void notifyPaymentSuccess(order.id).catch(() => {});
    return NextResponse.redirect(
      new URL(`/orders/${order.id}?placed=1`, request.url),
      302
    );
  }

  // Any other state = not paid. Record failure only if currently pending.
  if (order.payment_status === 'pending') {
    await admin
      .from('orders')
      .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('payment_status', 'pending');
    void notifyPaymentFailed(order.id).catch(() => {});
  }
  return NextResponse.redirect(
    new URL(`/orders/${order.id}?payment=failed`, request.url),
    302
  );
}
