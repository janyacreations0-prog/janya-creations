import crypto from 'crypto';
import { StandardCheckoutClient, StandardCheckoutPayRequest, Env } from '@phonepe-pg/pg-sdk-node';
import { getSiteUrl } from './site-url';

// ── Cashfree Payment Gateway (server-only) ───────────────────────────────────
// Official docs: https://www.cashfree.com/docs/api-reference/payments/latest/overview
// Verified current API version (v6): 2026-01-01
export const CASHFREE_API_VERSION = '2026-01-01';

export function isCashfreeConfigured(): boolean {
  return Boolean(
    process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_CLIENT_SECRET
  );
}

/** Sandbox vs production base URL for the Cashfree PG REST API. */
export function getCashfreeBaseUrl(): string {
  return process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';
}

export function getCashfreeMode(): 'sandbox' | 'production' {
  return process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION' ? 'production' : 'sandbox';
}

export interface CashfreeOrderResult {
  /** Our order number (sent as Cashfree order_id). */
  orderId: string;
  /** Cashfree payment_session_id used by the hosted checkout SDK. */
  paymentSessionId: string;
}

/**
 * Creates a Cashfree payment order for the exact server-calculated amount.
 * The browser is NOT trusted for the amount — the caller passes the server
 * total. Uses direct fetch against the Cashfree REST API (no SDK).
 */
export async function createCashfreeOrder(
  orderId: string,
  orderUuid: string,
  amount: number,
  customer: { name: string; email: string; phone: string }
): Promise<CashfreeOrderResult | null> {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const base = getCashfreeBaseUrl();
  const notifyUrl = `${getSiteUrl()}/api/payments/cashfree-webhook`;
  const returnUrl = `${getSiteUrl()}/orders/${orderUuid}?placed=1`;

  try {
    const res = await fetch(`${base}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-api-version': CASHFREE_API_VERSION,
        'x-request-id': crypto.randomUUID(),
        'x-idempotency-key': crypto.randomUUID(),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: orderId, // unique per order (no PII reuse issues)
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
        },
        order_meta: {
          return_url: returnUrl,
          notify_url: notifyUrl,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.payment_session_id) {
      console.error(
        `[cashfree] create order failed status=${res.status} orderId=${orderId}`
      );
      return null;
    }

    return { orderId, paymentSessionId: data.payment_session_id };
  } catch (e) {
    console.error('[cashfree] create order error:', e);
    return null;
  }
}

export interface CashfreeOrderStatus {
  orderId: string;
  orderStatus: string; // ACTIVE | PAID | EXPIRED | ...
  orderAmount: number;
  orderCurrency: string;
}

/**
 * Fetches the current Cashfree order status (used for server-side verification
 * after a webhook). Returns null on any error.
 */
export async function getCashfreeOrder(orderId: string): Promise<CashfreeOrderStatus | null> {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const base = getCashfreeBaseUrl();
  try {
    const res = await fetch(`${base}/orders/${encodeURIComponent(orderId)}`, {
      method: 'GET',
      headers: {
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
        'x-api-version': CASHFREE_API_VERSION,
        'x-request-id': crypto.randomUUID(),
        Accept: 'application/json',
      },
    });
    if (!res.ok) {
      console.error(`[cashfree] get order failed status=${res.status} orderId=${orderId}`);
      return null;
    }
    const data = await res.json();
    return {
      orderId: data.order_id,
      orderStatus: data.order_status,
      orderAmount: Number(data.order_amount),
      orderCurrency: data.order_currency,
    };
  } catch (e) {
    console.error('[cashfree] get order error:', e);
    return null;
  }
}

/**
 * Verifies a Cashfree webhook signature using the documented algorithm:
 *   signedPayload = x-webhook-timestamp + rawBody
 *   expected      = base64(HMAC-SHA256(signedPayload, clientSecret))
 * Signature is computed against the RAW body BEFORE any JSON parsing.
 */
export function verifyCashfreeWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  const secret = process.env.CASHFREE_CLIENT_SECRET;
  if (!secret || !signature || !timestamp || !rawBody) return false;
  try {
    const signedPayload = timestamp + rawBody;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('base64');
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch {
    return false;
  }
}

/**
 * PhonePe Payment Gateway helpers (Standard Checkout).
 * All credentials are read from server-only environment variables.
 * Amounts are in PAISE (PhonePe's currency unit): ₹1 = 100.
 */

function getEnv(): Env {
  return process.env.PHONEPE_ENV === 'PRODUCTION' ? Env.PRODUCTION : Env.SANDBOX;
}

export function isPhonePeConfigured(): boolean {
  return Boolean(
    process.env.PHONEPE_CLIENT_ID && process.env.PHONEPE_CLIENT_SECRET
  );
}

function getClient(): StandardCheckoutClient | null {
  const clientId = process.env.PHONEPE_CLIENT_ID;
  const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const clientVersion = Number(process.env.PHONEPE_CLIENT_VERSION) || 1;
  return StandardCheckoutClient.getInstance(clientId, clientSecret, clientVersion, getEnv());
}

export interface PhonePeCheckoutResult {
  /** URL the customer's browser is redirected to (PhonePe hosted checkout). */
  redirectUrl: string;
  /** PhonePe order id (stored as gateway_payment_id). */
  orderId: string;
}

/**
 * Creates a PhonePe Standard Checkout payment order for the exact server
 * amount. merchantOrderId is our local order number.
 */
export async function createPhonePePayment(
  merchantOrderId: string,
  amountPaise: number
): Promise<PhonePeCheckoutResult | null> {
  const client = getClient();
  if (!client) return null;

  const callbackUrl = `${getSiteUrl()}/api/payments/phonepe-callback`;

  try {
    const request = StandardCheckoutPayRequest.builder()
      .merchantOrderId(merchantOrderId)
      .amount(amountPaise)
      .redirectUrl(callbackUrl)
      .build();

    const response = await client.pay(request);
    return { redirectUrl: response.redirectUrl, orderId: response.orderId };
  } catch (e) {
    console.error('PhonePe pay order creation failed:', e);
    return null;
  }
}

export interface PhonePeCallbackPayload {
  state: string;
  amount: number; // paise
  merchantOrderId?: string;
  orderId: string;
}

/**
 * Validates a PhonePe Standard Checkout callback using the dashboard-configured
 * callback username/password (Basic auth). Returns the deserialized payload or
 * null when the callback is not authentic.
 */
export function validatePhonePeCallback(
  authorization: string | null,
  body: string
): PhonePeCallbackPayload | null {
  const client = getClient();
  const username = process.env.PHONEPE_CALLBACK_USERNAME;
  const password = process.env.PHONEPE_CALLBACK_PASSWORD;
  if (!client || !username || !password || !authorization) return null;

  try {
    const callback = client.validateCallback(username, password, authorization, body);
    return {
      state: callback.payload.state,
      amount: callback.payload.amount,
      merchantOrderId: callback.payload.merchantOrderId,
      orderId: callback.payload.orderId,
    };
  } catch (e) {
    console.error('PhonePe callback validation failed:', e);
    return null;
  }
}
