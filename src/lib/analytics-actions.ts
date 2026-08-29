'use server';

import { ensureVisitSession, recordEvent } from '@/lib/analytics';

/**
 * Server actions used by client components to record first-party funnel
 * events. Each reads the anonymous session cookie server-side and writes via
 * the service-role client. Never throws into the caller.
 */

export async function trackVisit(): Promise<void> {
  await ensureVisitSession();
}

export async function trackProductView(productId: string): Promise<void> {
  await recordEvent('product_view', { productId });
}

export async function trackAddToCart(productId: string, variant?: string): Promise<void> {
  await recordEvent('add_to_cart', {
    productId,
    metadata: variant ? { variant } : {},
  });
}

export async function trackCheckoutStart(): Promise<void> {
  await recordEvent('checkout_start');
}
