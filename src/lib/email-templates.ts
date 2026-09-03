import { getSiteUrl } from './site-url';

const BRAND = '#881337';
const TEXT = '#1e293b';
const MUTED = '#64748b';
const BORDER = '#e2e8f0';

function money(n: number | string): string {
  const v = Number(n) || 0;
  return `₹${v.toLocaleString('en-IN')}`;
}

export interface EmailItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_image?: string | null;
}

export interface EmailOrderData {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  subtotal: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_status: string;
  status: string;
  payment_gateway?: string;
  /** Customer-friendly payment method label (UPI, Card, Net Banking, Wallet...). */
  payment_method_label?: string;
  created_at?: string;
  shipping_address?: Record<string, string> | null;
  items?: EmailItem[];
}

export interface EmailCartData {
  items: EmailItem[];
  subtotal: number;
}

function baseLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:${TEXT};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:${BRAND};padding:20px 24px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">Janya Creations</h1>
            <p style="margin:4px 0 0;color:#fda4af;font-size:12px;">Handcrafted jewellery &amp; fashion</p>
          </td>
        </tr>
        <tr><td style="padding:24px;">${body}</td></tr>
        <tr>
          <td style="background:#f8fafc;padding:16px 24px;text-align:center;color:${MUTED};font-size:12px;">
            &copy; ${new Date().getFullYear()} Janya Creations &middot;
            <a href="${getSiteUrl()}" style="color:${BRAND};text-decoration:none;">Visit Store</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function orderItemsTable(items: EmailItem[]): string {
  if (!items || items.length === 0) return '';
  const rows = items
    .map(
      (it) => `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid ${BORDER};">
          <span style="font-size:14px;color:${TEXT};">${it.product_name}</span>
          <div style="font-size:12px;color:${MUTED};">Qty ${it.quantity} &times; ${money(it.unit_price)}</div>
        </td>
        <td align="right" style="padding:10px 8px;border-bottom:1px solid ${BORDER};font-size:14px;color:${TEXT};white-space:nowrap;">
          ${money(it.line_total)}
        </td>
      </tr>`
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    <tr><th align="left" style="padding:6px 8px;font-size:12px;color:${MUTED};text-transform:uppercase;">Item</th>
    <th align="right" style="padding:6px 8px;font-size:12px;color:${MUTED};text-transform:uppercase;">Total</th></tr>
    ${rows}
  </table>`;
}

function totalsBlock(o: EmailOrderData): string {
  const ship = Number(o.shipping_amount) > 0 ? money(o.shipping_amount) : 'FREE';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;font-size:14px;">
    <tr><td style="padding:4px 8px;color:${MUTED};">Subtotal</td><td align="right" style="padding:4px 8px;">${money(o.subtotal)}</td></tr>
    <tr><td style="padding:4px 8px;color:${MUTED};">Shipping</td><td align="right" style="padding:4px 8px;">${ship}</td></tr>
    ${Number(o.discount_amount) > 0 ? `<tr><td style="padding:4px 8px;color:${MUTED};">Discount</td><td align="right" style="padding:4px 8px;">- ${money(o.discount_amount)}</td></tr>` : ''}
    <tr><td style="padding:8px;font-weight:bold;color:${TEXT};border-top:1px solid ${BORDER};">Total</td>
    <td align="right" style="padding:8px;font-weight:bold;color:${TEXT};border-top:1px solid ${BORDER};">${money(o.total_amount)}</td></tr>
  </table>`;
}

function addressBlock(o: EmailOrderData): string {
  const a = o.shipping_address;
  if (!a) return '';
  const line1 = a.line1 || '';
  const line2 = a.line2 || '';
  const city = a.city || '';
  const state = a.state || '';
  const pincode = a.pincode || '';
  return `<p style="margin:4px 0;font-size:13px;color:${MUTED};">${line1}${line2 ? `, ${line2}` : ''}<br/>${city}, ${state} — ${pincode}</p>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr>
    <td style="background:${BRAND};border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;">${label}</a>
    </td></tr></table>`;
}

export function orderCreatedTemplate(o: EmailOrderData): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;color:${TEXT};">Hi ${o.customer_name},</h2>
    <p style="font-size:14px;line-height:1.6;color:${MUTED};">
      Thank you for your order <strong>${o.order_number}</strong>. Your order has been received and is
      awaiting payment. Complete your payment to confirm it.
    </p>
    ${orderItemsTable(o.items || [])}
    ${totalsBlock(o)}
    ${button(`${getSiteUrl()}/orders`, 'View My Orders')}
  `;
  return { subject: `Order received — ${o.order_number}`, html: baseLayout(body) };
}

export function paymentSuccessTemplate(o: EmailOrderData): { subject: string; html: string } {
  const methodLabel = o.payment_method_label || (o.payment_gateway === 'cod' ? 'Cash on Delivery' : 'Online Payment');
  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;color:${TEXT};">Payment successful, ${o.customer_name}!</h2>
    <p style="font-size:14px;line-height:1.6;color:${MUTED};">
      Your order <strong>${o.order_number}</strong> is confirmed. We are preparing your items for dispatch.
    </p>
    ${orderItemsTable(o.items || [])}
    ${totalsBlock(o)}
    <p style="margin:8px 0 0;font-size:13px;color:${MUTED};">Payment Method: <strong>${methodLabel}</strong></p>
    <p style="margin:4px 0 0;font-size:13px;color:${MUTED};">Payment Status: <strong>Payment Confirmed</strong></p>
    ${addressBlock(o)}
    ${button(`${getSiteUrl()}/orders`, 'View My Orders')}
  `;
  return { subject: `Payment confirmed — ${o.order_number}`, html: baseLayout(body) };
}

/** "Pay Now" button shown on unpaid COD orders. */
function payNowBlock(o: EmailOrderData): string {
  if (!o.order_id || o.payment_status === 'paid') return '';
  return `<p style="font-size:14px;line-height:1.6;color:${MUTED};">Want to pay online instead?</p>
    ${button(`${getSiteUrl()}/orders/${o.order_id}/pay`, 'Pay Now')}`;
}

export function codPlacedTemplate(o: EmailOrderData): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;color:${TEXT};">Order placed, ${o.customer_name}!</h2>
    <p style="font-size:14px;line-height:1.6;color:${MUTED};">
      Thank you for your order <strong>${o.order_number}</strong>. Your order has been placed and will be delivered to your address.
    </p>
    <p style="font-size:14px;line-height:1.6;color:${MUTED};">
      <strong>Payment method:</strong> Cash on Delivery<br/>
      <strong>Amount payable on delivery:</strong> ${money(o.total_amount)}
    </p>
    ${orderItemsTable(o.items || [])}
    ${totalsBlock(o)}
    ${payNowBlock(o)}
    ${addressBlock(o)}
    ${button(`${getSiteUrl()}/orders`, 'View My Orders')}
  `;
  return { subject: `Order placed — ${o.order_number}`, html: baseLayout(body) };
}

export function paymentFailedTemplate(o: EmailOrderData): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;color:${TEXT};">Payment failed</h2>
    <p style="font-size:14px;line-height:1.6;color:${MUTED};">
      Hi ${o.customer_name}, we could not process your payment for order <strong>${o.order_number}</strong>
      (${money(o.total_amount)}). No payment has been deducted. You can retry the payment from your cart.
    </p>
    ${button(`${getSiteUrl()}/cart`, 'Return to Cart')}
  `;
  return { subject: `Payment failed — ${o.order_number}`, html: baseLayout(body) };
}

export function orderStatusTemplate(
  o: EmailOrderData,
  headline: string,
  bodyText: string
): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;color:${TEXT};">${headline}, ${o.customer_name}</h2>
    <p style="font-size:14px;line-height:1.6;color:${MUTED};">${bodyText}</p>
    ${button(`${getSiteUrl()}/orders`, 'View Order')}
  `;
  return { subject: `Order ${o.status} — ${o.order_number}`, html: baseLayout(body) };
}

export function abandonedCartTemplate(
  name: string,
  items: EmailItem[],
  subtotal: number,
  isSecond: boolean
): { subject: string; html: string } {
  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;color:${TEXT};">Hi ${name},</h2>
    <p style="font-size:14px;line-height:1.6;color:${MUTED};">
      You left some lovely pieces in your cart. ${isSecond ? 'This is your final reminder before your items are released.' : 'Complete your order before they sell out.'}
    </p>
    ${orderItemsTable(items)}
    <p style="font-size:14px;color:${TEXT};"><strong>Subtotal: ${money(subtotal)}</strong></p>
    ${button(`${getSiteUrl()}/cart`, 'Return to Cart')}
    ${button(`${getSiteUrl()}/shop`, 'Continue Shopping')}
  `;
  return { subject: isSecond ? 'Your cart is waiting…' : 'You left something behind', html: baseLayout(body) };
}
