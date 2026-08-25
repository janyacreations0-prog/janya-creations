import { StandardCheckoutClient, StandardCheckoutPayRequest, Env } from '@phonepe-pg/pg-sdk-node';
import { getSiteUrl } from './site-url';

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
