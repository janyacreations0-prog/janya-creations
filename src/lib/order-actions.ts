'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createPhonePePayment,
  isCashfreeConfigured,
  createCashfreeOrder,
  getCashfreeMode,
} from '@/lib/payments';
import {
  notifyPaymentSuccess,
  notifyOrderStatusChange,
  notifyCodOrderPlaced,
} from '@/lib/email';
import { parseSizes } from '@/lib/sizes';
import { buildOrderAttribution, recordEvent } from '@/lib/analytics';
import { normalizeIndianPhone } from '@/lib/utils';

export interface CheckoutCustomerInput {
  name: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  /** 'cod' for Cash on Delivery, 'online' for online payment (Cashfree / PhonePe). */
  paymentMode: 'cod' | 'online';
}

export interface CreateOrderResult {
  success: boolean;
  error?: string;
  order?: {
    id: string;
    order_number: string;
    amount: number;
    /** Payment gateway/mode used for this order. */
    gateway?: 'cod' | 'cashfree' | 'phonepe';
    /** PhonePe hosted checkout URL — the customer is redirected here. */
    redirectUrl?: string;
    /** Cashfree hosted checkout session — the browser SDK opens with this. */
    paymentSessionId?: string;
    /** Cashfree environment mode used to initialise the browser SDK. */
    cashfreeMode?: 'sandbox' | 'production';
  };
}

function clean(v: string | undefined): string {
  return (v || '').trim();
}

/**
 * Creates a pending order from the customer's SERVER cart.
 * - Requires authentication.
 * - Re-reads every product server-side (price, stock, availability).
 * - Calculates the final payable amount on the server.
 * - Creates a PhonePe Standard Checkout order for that exact amount.
 */
export async function createOrder(
  input: CheckoutCustomerInput
): Promise<CreateOrderResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Please sign in to place your order.' };
    }

    const name = clean(input.name);
    const email = clean(input.email);
    const phone = clean(input.phone);
    if (!name || !email || !phone) {
      return { success: false, error: 'Please provide your name, email and phone.' };
    }
    if (!clean(input.address_line1) || !clean(input.city) || !clean(input.state) || !clean(input.pincode)) {
      return { success: false, error: 'Please complete your shipping address.' };
    }
    if (input.paymentMode !== 'cod' && input.paymentMode !== 'online') {
      return { success: false, error: 'Please choose a valid payment method.' };
    }

    // Server-side phone validation + normalisation (10-digit Indian mobile).
    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) {
      return { success: false, error: 'Enter a valid 10-digit mobile number.' };
    }

    // Use the authenticated user's verified email (server-side) rather than
    // trusting a client-supplied email that may differ from the account.
    const verifiedEmail = (user.email && user.email_confirmed_at) ? user.email : email;
    const finalEmail = verifiedEmail || email;

    // Read the customer's server cart (RLS: own rows only).
    const { data: cartItems } = await supabase
      .from('cart_items')
      .select('product_id, quantity, variant');

    if (!cartItems || cartItems.length === 0) {
      return { success: false, error: 'Your cart is empty.' };
    }

    const productIds = cartItems.map((i) => i.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity, image_url, attributes')
      .in('id', productIds);

    const productMap = new Map(
      (products || []).map((p: any) => [String(p.id), p])
    );

    /** Per-variant stock when a size is selected; base stock otherwise. */
    const availableStock = (product: any, variant: string): number => {
      if (!variant) return Number(product.stock_quantity) || 0;
      const opt = parseSizes(product.attributes ?? null).find((s) => s.value === variant);
      return opt ? opt.stock : 0;
    };

    // Server-side validation + amount calculation.
    let subtotal = 0;
    const orderItems: {
      product_id: string | null;
      product_name: string;
      product_image: string | null;
      unit_price: number;
      quantity: number;
      line_total: number;
      attributes: Record<string, unknown>;
    }[] = [];

    for (const item of cartItems) {
      const product = productMap.get(String(item.product_id));
      if (!product) {
        return {
          success: false,
          error: `A product in your cart is no longer available. Please review your cart.`,
        };
      }
      const variant = (item.variant as string) || '';
      const stock = availableStock(product, variant);
      if (stock <= 0) {
        return {
          success: false,
          error: variant
            ? `"${product.name}" (${variant}) is currently out of stock.`
            : `"${product.name}" is currently out of stock.`,
        };
      }
      if (item.quantity > stock) {
        return {
          success: false,
          error: variant
            ? `Only ${stock} unit(s) of "${product.name}" (${variant}) are available. Please update quantity.`
            : `Only ${stock} unit(s) of "${product.name}" are available. Please update quantity.`,
        };
      }
      const unitPrice = Number(product.price) || 0;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url || null,
        unit_price: unitPrice,
        quantity: item.quantity,
        line_total: lineTotal,
        attributes: {
          ...(product.attributes ?? {}),
          size: variant || undefined,
        },
      });
    }

    const shippingAmount = 0; // free shipping
    const discountAmount = 0;
    const totalAmount = Math.round((subtotal + shippingAmount - discountAmount) * 100) / 100;

    const shippingAddress = {
      line1: clean(input.address_line1),
      line2: clean(input.address_line2),
      city: clean(input.city),
      state: clean(input.state),
      pincode: clean(input.pincode),
      country: clean(input.country) || 'India',
    };

    // Create the DB order (pending / payment pending). Attribution snapshot is
    // taken now and stored historically — later session changes never alter it.
    const attribution = await buildOrderAttribution();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        payment_status: 'pending',
        payment_gateway: input.paymentMode === 'cod' ? 'cod' : null,
        subtotal,
        shipping_amount: shippingAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        currency: 'INR',
        customer_name: name,
        customer_email: finalEmail,
        customer_phone: normalizedPhone,
        shipping_address: shippingAddress,
        attribution,
      })
      .select('id, order_number, total_amount')
      .single();

    if (orderError || !order) {
      console.error('Order insert failed:', orderError?.message);
      return { success: false, error: 'Unable to create your order. Please try again.' };
    }

    // Insert order items.
    const { error: itemsError } = await supabase.from('order_items').insert(
      orderItems.map((oi) => ({ order_id: order.id, ...oi }))
    );
    if (itemsError) {
      console.error('Order items insert failed:', itemsError.message);
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
      return { success: false, error: 'Unable to create your order. Please try again.' };
    }

    // ── Payment method selection ─────────────────────────────────────────────
    const amount = totalAmount;
    let gateway: 'cod' | 'cashfree' | 'phonepe';
    let gatewayPaymentId: string | null = null;
    let redirectUrl: string | undefined;
    let paymentSessionId: string | undefined;
    let cashfreeMode: 'sandbox' | 'production' | undefined;

    if (input.paymentMode === 'cod') {
      // ── COD branch ───────────────────────────────────────────────────────
      // Confirm the COD order atomically: stock decrement, cart clear,
      // status → confirmed. payment_status remains 'pending' (due on delivery).
      // NOTE: confirm_cod_order revokes EXECUTE from anon/authenticated, so it
      // must be invoked through the service-role admin client — exactly like the
      // Cashfree webhook calls confirm_order_payment.
      const admin = createAdminClient();
      const { error: codError } = await admin.rpc('confirm_cod_order', {
        p_order_id: order.id,
      });
      if (codError) {
        console.error('COD confirmation failed:', codError.message);
        // Leave the order in a safe recoverable state (pending).
        return {
          success: false,
          error: 'Unable to place your order. Please try again.',
          order: { id: order.id, order_number: order.order_number, amount },
        };
      }
      gateway = 'cod';

      // COD analytics — identify the payment mode (not cashfree/phonepe).
      void recordEvent('order_created', {
        orderId: order.id,
        metadata: { gateway: 'cod' },
      }).catch(() => {});

      // COD confirmation email (idempotent — distinct event_type).
      // NOTE: notifyOrderCreated is intentionally NOT fired for COD because it
      // says "awaiting payment"; COD has no online payment step.
      void notifyCodOrderPlaced(order.id).catch(() => {});

      // Ensure the order carries payment_gateway='cod' (set at insert, but
      // confirm with an explicit admin update + error check).
      const { error: codGatewayError } = await admin
        .from('orders')
        .update({ payment_gateway: 'cod', updated_at: new Date().toISOString() })
        .eq('id', order.id);
      if (codGatewayError) {
        console.error('COD gateway update failed:', codGatewayError.message);
        return {
          success: false,
          error: 'Unable to place your order. Please try again.',
          order: { id: order.id, order_number: order.order_number, amount },
        };
      }
    } else {
      // ── Online payment branch ────────────────────────────────────────────
      // Cashfree is the default gateway when configured; PhonePe remains the
      // fully supported fallback (rollback option).
      const useCashfree = isCashfreeConfigured();

      if (useCashfree) {
        const cfOrder = await createCashfreeOrder(String(order.order_number), String(order.id), amount, {
          name: clean(input.name) || 'Customer',
          email: finalEmail,
          phone: normalizedPhone,
        });
        if (cfOrder) {
          gateway = 'cashfree';
          gatewayPaymentId = cfOrder.orderId;
          paymentSessionId = cfOrder.paymentSessionId;
          cashfreeMode = getCashfreeMode();
        } else {
          // Cashfree order creation failed — do NOT fall through to PhonePe.
          console.error('Cashfree payment order creation failed or keys not configured.');
          return {
            success: false,
            error: 'Unable to start secure payment. Please try again.',
            order: { id: order.id, order_number: order.order_number, amount },
          };
        }
      } else {
        // PhonePe fallback — existing flow unchanged.
        const ppOrder = await createPhonePePayment(
          String(order.order_number),
          Math.round(amount * 100)
        );
        if (!ppOrder) {
          console.error('PhonePe payment order creation failed or keys not configured.');
          return {
            success: false,
            error: 'Payment gateway is not configured yet. Please contact support.',
            order: { id: order.id, order_number: order.order_number, amount },
          };
        }
        gateway = 'phonepe';
        gatewayPaymentId = ppOrder.orderId;
        redirectUrl = ppOrder.redirectUrl;
      }

      // First-party funnel event — payment was initiated at the gateway.
      void recordEvent('payment_initiated', {
        orderId: order.id,
        metadata: { gateway },
      }).catch(() => {});

      // Store the gateway order id (admin client — customers have no UPDATE
      // grant on orders; only trusted server code may write this).
      const admin = createAdminClient();
      const { error: gatewayUpdateError } = await admin
        .from('orders')
        .update({
          gateway_payment_id: gatewayPaymentId,
          payment_gateway: gateway,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
      if (gatewayUpdateError) {
        console.error('Gateway update failed:', gatewayUpdateError.message);
        return {
          success: false,
          error: 'Unable to start secure payment. Please try again.',
          order: { id: order.id, order_number: order.order_number, amount },
        };
      }

      // Online payment branch (Cashfree / PhonePe).
      // NOTE: Do NOT send an "order_created" customer email here.
      // The customer notification for online payments comes from the
      // payment_success / payment_failed webhook flow (see cashfree-webhook
      // route.ts). Sending an "awaiting payment" email from createOrder()
      // risks delivering it AFTER payment confirmation due to Vercel
      // serverless function freeze terminating fire-and-forget async work.
      void recordEvent('order_created', { orderId: order.id }).catch(() => {});
    }

    return {
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        amount,
        gateway,
        redirectUrl,
        paymentSessionId,
        cashfreeMode,
      },
    };
  } catch (e) {
    console.error('createOrder error:', e);
    return { success: false, error: 'Unable to create your order. Please try again.' };
  }
}

/**
 * "Pay Now" — initiates an online (Cashfree) payment for a specific existing
 * order (used from the COD confirmation email). Secure, order-scoped flow:
 *  - authenticated + ownership via RLS
 *  - only unpaid/pending orders can be paid
 *  - returns a payment session for Cashfree Hosted Checkout
 * Does NOT mark the order paid and does NOT accept an arbitrary order id from
 * the browser — the server looks up the exact order for the session user.
 */
export async function payOrderOnline(
  orderId: string
): Promise<{
  success: boolean;
  error?: string;
  order?: {
    id: string;
    order_number: string;
    amount: number;
    gateway: 'cashfree';
    paymentSessionId: string;
    cashfreeMode: 'sandbox' | 'production';
  };
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Please sign in to pay for your order.' };
    }

    // RLS restricts this to the authenticated owner's order.
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, payment_status, customer_name, customer_email, customer_phone')
      .eq('id', orderId)
      .maybeSingle();
    if (error || !order) {
      return { success: false, error: 'Order not found.' };
    }
    if (order.payment_status === 'paid') {
      return { success: false, error: 'This order is already paid.' };
    }
    if (order.payment_status !== 'pending') {
      return { success: false, error: 'This order is not eligible for payment.' };
    }

    const amount = Number(order.total_amount);
    const cfOrder = await createCashfreeOrder(
      String(order.order_number),
      String(order.id),
      amount,
      {
        name: order.customer_name || 'Customer',
        email: order.customer_email,
        phone: order.customer_phone,
      }
    );
    if (!cfOrder) {
      return { success: false, error: 'Unable to start secure payment. Please try again.' };
    }

    // Record the gateway reference (admin client; customers have no UPDATE grant).
    const admin = createAdminClient();
    await admin
      .from('orders')
      .update({
        gateway_payment_id: cfOrder.orderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    return {
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        amount,
        gateway: 'cashfree',
        paymentSessionId: cfOrder.paymentSessionId,
        cashfreeMode: getCashfreeMode(),
      },
    };
  } catch (e) {
    console.error('payOrderOnline error:', e);
    return { success: false, error: 'Unable to start secure payment. Please try again.' };
  }
}

/**
 * Admin-only fulfillment status update. Transition validation is enforced
 * server-side by the trusted admin_update_order_status RPC (SECURITY DEFINER).
 */
export async function adminUpdateOrderStatus(
  orderId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated.' };

    // Admin check (defense in depth — RLS also requires is_admin()).
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role !== 'admin') {
      return { success: false, error: 'Admin access required.' };
    }

    const { error } = await supabase.rpc('admin_update_order_status', {
      p_order_id: orderId,
      p_status: newStatus,
    });
    if (error) {
      return { success: false, error: error.message || 'Failed to update order status.' };
    }

    void notifyOrderStatusChange(orderId, newStatus).catch(() => {});

    return { success: true };
  } catch (e) {
    console.error('adminUpdateOrderStatus error:', e);
    return { success: false, error: 'Failed to update order status.' };
  }
}