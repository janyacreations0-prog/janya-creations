/**
 * Centralized transactional email service.
 * - Sends via the Resend API (existing integration). Failures are logged and
 *   never break checkout / payment / order flows.
 * - Every logical event is recorded in order_email_events (idempotency + admin
 *   visibility). Unique constraints prevent duplicate sends.
 * - Only the trusted server-side path (service-role client) touches the event
 *   log; RESEND_API_KEY never leaves the server.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import { isResendConfigured, sendEmail } from './email/resend';
import {
  orderCreatedTemplate,
  paymentSuccessTemplate,
  paymentFailedTemplate,
  codPlacedTemplate,
  orderStatusTemplate,
  abandonedCartTemplate,
  type EmailOrderData,
} from './email-templates';

export interface EmailEvent {
  id: string;
  order_id: string | null;
  cart_id: string | null;
  email: string;
  event_type: string;
  status: string;
  provider_message_id: string | null;
  attempt_count: number;
  last_error: string | null;
  sent_at: string | null;
  created_at: string;
}

/**
 * Sends a transactional email via Resend and maps the result to the internal
 * event-outcome shape used by recordOutcome().
 */
async function sendTransactionalEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!isResendConfigured()) {
    return { ok: false, error: 'Email not configured' };
  }
  const result = await sendEmail({ to, subject, html });
  return {
    ok: result.success,
    messageId: result.emailId,
    error: result.error,
  };
}

/**
 * Atomically claims the event record. Returns true only if this caller is the
 * first to record the event (duplicates are prevented by the unique
 * constraints on (order_id, event_type) and (cart_id, event_type)).
 */
async function claimEvent(args: {
  orderId?: string;
  cartId?: string;
  userId?: string;
  email: string;
  eventType: string;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const byOrder = Boolean(args.orderId);
    const { data: existing } = await admin
      .from('order_email_events')
      .select('id')
      .eq(byOrder ? 'order_id' : 'cart_id', byOrder ? args.orderId! : args.cartId!)
      .eq('event_type', args.eventType)
      .maybeSingle();
    if (existing) return false;

    const { error } = await admin.from('order_email_events').insert({
      order_id: args.orderId ?? null,
      cart_id: args.cartId ?? null,
      user_id: args.userId ?? null,
      email: args.email,
      event_type: args.eventType,
    });
    if (error) {
      // Unique-constraint race: another path already recorded it.
      return false;
    }
    return true;
  } catch (e) {
    console.error('[email] claimEvent error:', e);
    return false;
  }
}

async function recordOutcome(
  filter: { orderId?: string; cartId?: string; eventType: string },
  outcome: { ok: boolean; messageId?: string; error?: string }
): Promise<void> {
  try {
    const admin = createAdminClient();
    const byOrder = Boolean(filter.orderId);
    const { data: event } = await admin
      .from('order_email_events')
      .select('id, attempt_count')
      .eq(byOrder ? 'order_id' : 'cart_id', byOrder ? filter.orderId! : filter.cartId!)
      .eq('event_type', filter.eventType)
      .maybeSingle();
    if (!event) return;
    await admin
      .from('order_email_events')
      .update({
        status: outcome.ok ? 'sent' : 'failed',
        provider_message_id: outcome.messageId ?? null,
        attempt_count: (event.attempt_count || 0) + 1,
        last_error: outcome.ok ? null : outcome.error ?? null,
        sent_at: outcome.ok ? new Date().toISOString() : null,
      })
      .eq('id', event.id);
  } catch (e) {
    console.error('[email] recordOutcome error:', e);
  }
}

async function loadOrderForEmail(orderId: string): Promise<EmailOrderData | null> {
  try {
    const admin = createAdminClient();
    const { data: order } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return null;
    const { data: items } = await admin
      .from('order_items')
      .select('product_name, quantity, unit_price, line_total, product_image')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    return {
      order_id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      subtotal: Number(order.subtotal),
      shipping_amount: Number(order.shipping_amount),
      discount_amount: Number(order.discount_amount),
      total_amount: Number(order.total_amount),
      payment_status: order.payment_status,
      status: order.status,
      payment_gateway: order.payment_gateway,
      created_at: order.created_at,
      shipping_address: order.shipping_address ?? null,
      items: items || [],
    };
  } catch (e) {
    console.error('[email] loadOrderForEmail error:', e);
    return null;
  }
}

async function notifyOrderEvent(
  orderId: string,
  eventType: string,
  build: (o: EmailOrderData) => { subject: string; html: string },
  extra?: Partial<EmailOrderData>
): Promise<void> {
  const order = await loadOrderForEmail(orderId);
  if (!order) return;

  if (!isResendConfigured()) {
    // Record a skipped marker so admin visibility still works, then stop.
    try {
      await createAdminClient()
        .from('order_email_events')
        .insert({
          order_id: orderId,
          email: order.customer_email,
          event_type: eventType,
          status: 'skipped',
          last_error: 'RESEND_API_KEY not configured',
        });
    } catch {
      // ignore
    }
    return;
  }

  if (!(await claimEvent({ orderId, email: order.customer_email, eventType }))) {
    return; // already sent (duplicate webhook/callback/status submission)
  }

  const { subject, html } = build({ ...order, ...extra });
  const result = await sendTransactionalEmail(order.customer_email, subject, html);
  await recordOutcome({ orderId, eventType }, result);
}

// --- Event entry points (called from trusted server-side paths) -------------

export async function notifyOrderCreated(orderId: string): Promise<void> {
  await notifyOrderEvent(orderId, 'order_created', orderCreatedTemplate);
}

export async function notifyPaymentSuccess(
  orderId: string,
  paymentMethodLabel?: string
): Promise<void> {
  await notifyOrderEvent(
    orderId,
    'payment_success',
    paymentSuccessTemplate,
    paymentMethodLabel ? { payment_method_label: paymentMethodLabel } : undefined
  );
}

export async function notifyPaymentFailed(orderId: string): Promise<void> {
  await notifyOrderEvent(orderId, 'payment_failed', paymentFailedTemplate);
}

export async function notifyCodOrderPlaced(orderId: string): Promise<void> {
  await notifyOrderEvent(orderId, 'order_placed_cod', codPlacedTemplate);
}

const STATUS_EVENT_MAP: Record<string, { type: string; headline: string; body: (o: EmailOrderData) => string }> = {
  processing: {
    type: 'order_processing',
    headline: 'Your order is being processed',
    body: (o) => `Your order <strong>${o.order_number}</strong> is being carefully packed.`,
  },
  shipped: {
    type: 'order_shipped',
    headline: 'Your order has shipped',
    body: (o) => `Your order <strong>${o.order_number}</strong> is on its way to you.`,
  },
  delivered: {
    type: 'order_delivered',
    headline: 'Your order has been delivered',
    body: (o) => `Your order <strong>${o.order_number}</strong> has been delivered. Enjoy!`,
  },
  cancelled: {
    type: 'order_cancelled',
    headline: 'Your order was cancelled',
    body: (o) => `Your order <strong>${o.order_number}</strong> has been cancelled.`,
  },
};

export async function notifyOrderStatusChange(orderId: string, newStatus: string): Promise<void> {
  const cfg = STATUS_EVENT_MAP[newStatus];
  if (!cfg) return;
  await notifyOrderEvent(orderId, cfg.type, (o) =>
    orderStatusTemplate(o, cfg.headline, cfg.body(o))
  );
}

// --- Admin visibility --------------------------------------------------------

export async function getEmailEventsForOrder(orderId: string): Promise<EmailEvent[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('order_email_events')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    return (data || []) as EmailEvent[];
  } catch (e) {
    console.error('[email] getEmailEventsForOrder error:', e);
    return [];
  }
}

// --- Abandoned cart ----------------------------------------------------------

const FIRST_REMINDER_HOURS = 2;
const SECOND_REMINDER_HOURS = 24;
const MAX_CARTS_PER_RUN = 50;

export async function processAbandonedCarts(): Promise<{ scanned: number; sent: number }> {
  if (!isResendConfigured()) {
    console.warn('[email] Abandoned-cart scan skipped: email not configured.');
    return { scanned: 0, sent: 0 };
  }

  const admin = createAdminClient();
  const now = Date.now();
  const threshold1 = new Date(now - FIRST_REMINDER_HOURS * 60 * 60 * 1000).toISOString();
  const threshold2 = new Date(now - SECOND_REMINDER_HOURS * 60 * 60 * 1000).toISOString();

  let scanned = 0;
  let sent = 0;

  try {
    const { data: carts } = await admin
      .from('carts')
      .select('id, user_id, profiles(email, full_name), cart_items(product_id, quantity, updated_at)')
      .limit(MAX_CARTS_PER_RUN);

    for (const cart of (carts || []) as any[]) {
      scanned += 1;
      const items: { product_id: string; quantity: number; updated_at: string }[] =
        cart.cart_items || [];
      if (items.length === 0) continue;

      const email = cart.profiles?.email;
      if (!email) continue; // no reliable email identity

      const lastActivity = items.reduce(
        (max, it) => (it.updated_at > max ? it.updated_at : max),
        ''
      );
      if (!lastActivity) continue;
      const lastTs = new Date(lastActivity).getTime();

      // Determine the reminder stage (max 2).
      let stage: 1 | 2 | null = null;
      if (lastTs <= new Date(threshold2).getTime()) stage = 2;
      else if (lastTs <= new Date(threshold1).getTime()) stage = 1;
      else continue; // below threshold

      const eventType = `abandoned_cart_${stage}`;

      // Skip if this reminder was already sent.
      const { data: existing } = await admin
        .from('order_email_events')
        .select('id')
        .eq('cart_id', cart.id)
        .eq('event_type', eventType)
        .maybeSingle();
      if (existing) continue;

      // Skip if the customer is currently mid-checkout (recent pending order).
      const { data: recentOrder } = await admin
        .from('orders')
        .select('id')
        .eq('user_id', cart.user_id)
        .eq('status', 'pending')
        .gte('created_at', new Date(now - 2 * 60 * 60 * 1000).toISOString())
        .limit(1)
        .maybeSingle();
      if (recentOrder) continue;

      // Re-check products exist + available (server/database truth, not client).
      const productIds = items.map((i) => i.product_id);
      const { data: products } = await admin
        .from('products')
        .select('id, name, price, stock_quantity, image_url')
        .in('id', productIds);
      const prodMap = new Map((products || []).map((p: any) => [String(p.id), p]));

      const emailItems: any[] = [];
      let subtotal = 0;
      for (const item of items) {
        const product = prodMap.get(String(item.product_id));
        if (!product || (product.stock_quantity ?? 0) <= 0) continue; // skip unavailable
        const unit = Number(product.price) || 0;
        emailItems.push({
          product_name: product.name,
          quantity: item.quantity,
          unit_price: unit,
          line_total: unit * item.quantity,
          product_image: product.image_url || null,
        });
        subtotal += unit * item.quantity;
      }
      if (emailItems.length === 0) continue;

      if (!(await claimEvent({ cartId: String(cart.id), userId: cart.user_id, email, eventType }))) {
        continue;
      }

      const { subject, html } = abandonedCartTemplate(
        cart.profiles?.full_name || 'there',
        emailItems,
        subtotal,
        stage === 2
      );
      const result = await sendTransactionalEmail(email, subject, html);
      await recordOutcome({ cartId: String(cart.id), eventType }, result);
      if (result.ok) sent += 1;
    }
  } catch (e) {
    console.error('[email] processAbandonedCarts error:', e);
  }

  return { scanned, sent };
}
