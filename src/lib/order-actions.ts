'use server';

import { createClient } from '@/lib/supabase/server';
import { createPhonePePayment } from '@/lib/payments';
import {
  notifyOrderCreated,
  notifyPaymentSuccess,
  notifyOrderStatusChange,
} from '@/lib/email';

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
}

export interface CreateOrderResult {
  success: boolean;
  error?: string;
  order?: {
    id: string;
    order_number: string;
    amount: number;
    /** PhonePe hosted checkout URL — the customer is redirected here. */
    redirectUrl?: string;
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

    // Read the customer's server cart (RLS: own rows only).
    const { data: cartItems } = await supabase
      .from('cart_items')
      .select('product_id, quantity');

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
      const stock = product.stock_quantity ?? 0;
      if (stock <= 0) {
        return {
          success: false,
          error: `"${product.name}" is currently out of stock.`,
        };
      }
      if (item.quantity > stock) {
        return {
          success: false,
          error: `Only ${stock} unit(s) of "${product.name}" are available. Please update quantity.`,
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
        attributes: product.attributes ?? {},
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

    // Create the DB order (pending / payment pending).
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        status: 'pending',
        payment_status: 'pending',
        subtotal,
        shipping_amount: shippingAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        currency: 'INR',
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        shipping_address: shippingAddress,
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

    // Fire order-created notification (graceful; never blocks checkout).
    void notifyOrderCreated(order.id).catch(() => {});

    // Create the PhonePe Standard Checkout order for the server-calculated amount.
    const ppOrder = await createPhonePePayment(
      String(order.order_number),
      Math.round(totalAmount * 100)
    );

    if (!ppOrder) {
      // Gateway not configured or failed — keep the order pending for admin follow-up.
      console.error('PhonePe payment order creation failed or keys not configured.');
      return {
        success: false,
        error: 'Payment gateway is not configured yet. Please contact support.',
        order: {
          id: order.id,
          order_number: order.order_number,
          amount: totalAmount,
        },
      };
    }

    // Store the gateway order id.
    await supabase
      .from('orders')
      .update({ gateway_payment_id: ppOrder.orderId, payment_gateway: 'phonepe' })
      .eq('id', order.id);

    return {
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        amount: totalAmount,
        redirectUrl: ppOrder.redirectUrl,
      },
    };
  } catch (e) {
    console.error('createOrder error:', e);
    return { success: false, error: 'Unable to create your order. Please try again.' };
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