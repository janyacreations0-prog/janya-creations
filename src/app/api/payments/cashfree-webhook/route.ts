import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  verifyCashfreeWebhook,
  getCashfreeOrder,
} from '@/lib/payments';
import { notifyPaymentSuccess, notifyPaymentFailed } from '@/lib/email';
import { recordEventForSession } from '@/lib/analytics';

/** Maps Cashfree payment group values to customer-friendly labels. */
function mapCashfreeMethod(group: string): string {
  const map: Record<string, string> = {
    upi: 'UPI',
    card: 'Credit/Debit Card',
    netbanking: 'Net Banking',
    wallet: 'Wallet',
    paylater: 'Pay Later',
    qr: 'QR',
  };
  return map[group.toLowerCase()] || 'Online Payment';
}

/**
 * Cashfree Payment Gateway server-to-server webhook.
 *
 * Cashfree POSTs payment events to this endpoint with a signature header.
 * The webhook is the ONLY authoritative payment confirmation:
 *   1. Raw body is captured BEFORE parsing.
 *   2. HMAC-SHA256 signature verified against the raw body.
 *   3. Order looked up by order_id.
 *   4. Amount + currency verified against our stored order.
 *   5. For SUCCESS: server-side Cashfree order status verification (defense-
 *      in-depth), then existing confirm_order_payment RPC (idempotent).
 *   6. Browser redirects alone never mark an order paid.
 *
 * Webhook version: 2026-01-01 (current Cashfree API version).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-webhook-signature');
  const timestamp = request.headers.get('x-webhook-timestamp');
  const idempotencyKey = request.headers.get('x-idempotency-key');
  const webhookAttempt = request.headers.get('x-webhook-attempt');

  // 1. Verify the webhook signature against the raw body (before JSON parse).
  if (!verifyCashfreeWebhook(rawBody, signature, timestamp)) {
    console.error(`[cashfree] webhook signature invalid`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 2. Now safe to parse JSON.
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = payload.type;
  const orderData = payload.data?.order;
  const paymentData = payload.data?.payment;
  const orderId = orderData?.order_id;
  const orderAmount = orderData?.order_amount;
  const orderCurrency = orderData?.order_currency;
  const cfPaymentId = paymentData?.cf_payment_id;
  const paymentStatus = paymentData?.payment_status;
  const paymentAmount = paymentData?.payment_amount;
  const paymentCurrency = paymentData?.payment_currency;

  if (!orderId) {
    return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
  }

  // 3. Safe diagnostic logging.
  console.error(
    `[cashfree] webhook orderId=${orderId} type=${eventType} paymentStatus=${paymentStatus} cfPaymentId=${cfPaymentId} attempt=${webhookAttempt} idempotency=${idempotencyKey?.slice(0, 8)}`
  );

  const admin = createAdminClient();

  // 4. Look up our order by order_number.
  const { data: order } = await admin
    .from('orders')
    .select('id, order_number, total_amount, currency, payment_status, status, payment_gateway, attribution')
    .eq('order_number', orderId)
    .maybeSingle();

  if (!order) {
    console.error(`[cashfree] webhook for unknown order: ${orderId}`);
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  // Defensive: reject a COD order that was never reserved (not confirmed) —
  // COD orders that went through confirm_cod_order are status='confirmed' and
  // may legitimately be paid online later via "Pay Now".
  if (order.payment_gateway === 'cod' && order.status !== 'confirmed') {
    console.error(`[cashfree] webhook rejected — unconfirmed COD order: ${orderId}`);
    return NextResponse.json({ error: 'Order is COD' }, { status: 400 });
  }

  // 5. Amount must match our server-calculated total AND the Cashfree order
  //    amount AND the actual payment amount. Safe monetary comparison.
  const expectedAmount = Number(order.total_amount);
  const orderAmt = Number(orderAmount);
  const payAmt = Number(paymentAmount);

  if (!Number.isFinite(orderAmt) || !Number.isFinite(payAmt)) {
    console.error(`[cashfree] invalid numeric amount order=${orderId}`);
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  const amountsMatch =
    Math.abs(orderAmt - expectedAmount) <= 0.005 &&
    Math.abs(payAmt - expectedAmount) <= 0.005 &&
    Math.abs(orderAmt - payAmt) <= 0.005;

  if (!amountsMatch) {
    console.error(
      `[cashfree] amount mismatch order=${orderId}: expected=${expectedAmount} orderAmount=${orderAmt} paymentAmount=${payAmt}`
    );
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
  }

  // 6. Currency must be INR on the order, the payment, and our stored order.
  if (
    orderCurrency !== 'INR' ||
    paymentCurrency !== 'INR' ||
    order.currency !== 'INR'
  ) {
    console.error(
      `[cashfree] currency mismatch order=${orderId}: orderCurrency=${orderCurrency} paymentCurrency=${paymentCurrency} stored=${order.currency}`
    );
    return NextResponse.json({ error: 'Currency mismatch' }, { status: 400 });
  }

  // 7. Process by event type.
  if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' && paymentStatus === 'SUCCESS') {
    // Defense-in-depth: verify order status with Cashfree server-side API.
    const cfStatus = await getCashfreeOrder(orderId);
    if (!cfStatus) {
      console.error(`[cashfree] server-side verification failed for order=${orderId}`);
      return NextResponse.json({ error: 'Verification failed' }, { status: 502 });
    }
    if (cfStatus.orderStatus !== 'PAID') {
      console.error(
        `[cashfree] order not PAID server-side order=${orderId} status=${cfStatus.orderStatus}`
      );
      return NextResponse.json({ error: 'Order not paid' }, { status: 400 });
    }

    // Map the Cashfree payment group/method to a customer-friendly label.
    const paymentGroup =
      (paymentData as any)?.payment_group || (paymentData as any)?.payment_method?.type || '';
    const methodLabel = mapCashfreeMethod(paymentGroup);

    if (order.payment_gateway === 'cod') {
      // COD order being paid online later via the "Pay Now" email link. COD
      // already decremented stock + cleared cart atomically at placement
      // (confirm_cod_order). Mark it paid WITHOUT decrementing stock a second
      // time — the no-stock RPC keeps inventory consistent.
      await admin.rpc('mark_order_paid_no_stock', {
        p_order_id: order.id,
        p_gateway: 'cashfree',
        p_gateway_payment_id: cfPaymentId,
      });
    } else {
      // Normal online order (status pending → paid). Trusted, idempotent
      // confirmation — uses existing RPC (decrements stock).
      await admin.rpc('confirm_order_payment', {
        p_order_id: order.id,
        p_gateway: 'cashfree',
        p_gateway_payment_id: cfPaymentId,
      });
    }

    // Send the payment-success email and record analytics BEFORE responding.
    // Vercel may freeze/terminate the serverless function as soon as the
    // response is returned, which kills fire-and-forget async work — so the
    // email chain (claimEvent → Resend → recordOutcome) would never complete.
    try {
      await notifyPaymentSuccess(order.id, methodLabel);
    } catch (e) {
      console.error('[cashfree] payment_success email failed:', e);
    }

    const attribution = (order.attribution as { session_id?: string } | null) ?? null;
    try {
      await recordEventForSession('payment_success', attribution?.session_id ?? null, {
        orderId: order.id,
        metadata: { gateway: 'cashfree', cf_payment_id: cfPaymentId, method: paymentGroup },
      });
    } catch (e) {
      console.error('[cashfree] payment_success analytics failed:', e);
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  if (eventType === 'PAYMENT_FAILED_WEBHOOK') {
    // Only mark as failed if currently pending AND it is an online order
    // (COD orders stay pending — payment is due on delivery).
    if (order.payment_status === 'pending' && order.status !== 'confirmed') {
      await admin
        .from('orders')
        .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', order.id)
        .eq('payment_status', 'pending');
      void notifyPaymentFailed(order.id).catch(() => {});
    }
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  if (eventType === 'PAYMENT_USER_DROPPED_WEBHOOK') {
    // User abandoned the payment — leave the order pending.
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // Unknown event type — acknowledge to prevent retries.
  return NextResponse.json({ status: 'ignored' }, { status: 200 });
}