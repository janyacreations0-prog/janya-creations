import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * First-party attribution + conversion tracking (Phase 1).
 *
 * All writes go through the trusted server-side service-role client, so
 * visitors can never forge analytics rows (no anon/authenticated INSERT
 * policies). Every helper fails closed and never throws into the funnel —
 * attribution must never break checkout/orders.
 */

export const SESSION_COOKIE = 'jc_s';
export const ATTR_COOKIE = 'jc_a';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

export interface AttributionTouch {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  ref?: string;
  landingPath?: string;
}

export interface AttributionData {
  f?: AttributionTouch; // first touch
  l?: AttributionTouch; // last touch
}

export interface SessionContext {
  sessionId?: string;
  attribution: AttributionData;
}

function readAttrCookie(raw?: string): AttributionData {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function touchRow(prefix: 'first' | 'last', t: AttributionTouch | undefined) {
  return {
    [`${prefix}_source`]: t?.source || 'direct',
    [`${prefix}_medium`]: t?.medium ?? null,
    [`${prefix}_campaign`]: t?.campaign ?? null,
    [`${prefix}_content`]: t?.content ?? null,
    [`${prefix}_ref`]: t?.ref ?? null,
    [`${prefix}_landing_path`]: t?.landingPath ?? null,
  };
}

/** Reads the anonymous session + attribution cookies (server-side only). */
export async function getSessionContext(): Promise<SessionContext> {
  const store = await cookies();
  return {
    sessionId: store.get(SESSION_COOKIE)?.value,
    attribution: readAttrCookie(store.get(ATTR_COOKIE)?.value),
  };
}

/** Upserts the visit_sessions row for the current session. */
export async function ensureVisitSession(): Promise<boolean> {
  try {
    const ctx = await getSessionContext();
    if (!ctx.sessionId) return false;
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin.from('visit_sessions').upsert(
      {
        session_id: ctx.sessionId,
        ...touchRow('first', ctx.attribution.f),
        ...touchRow('last', ctx.attribution.l),
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: 'session_id' }
    );
    return !error;
  } catch (e) {
    console.error('[analytics] ensureVisitSession error:', e);
    return false;
  }
}

/**
 * Records a funnel event for the CURRENT session (reads cookies). Used by
 * server actions (product view, add-to-cart, checkout start, etc.).
 */
export async function recordEvent(
  eventName: string,
  opts: { productId?: string; orderId?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const ctx = await getSessionContext();
    if (!ctx.sessionId) return;
    await ensureVisitSession();
    const admin = createAdminClient();
    await admin.from('analytics_events').insert({
      session_id: ctx.sessionId,
      event_name: eventName,
      product_id: opts.productId ?? null,
      order_id: opts.orderId ?? null,
      metadata: opts.metadata ?? {},
    });
  } catch (e) {
    console.error(`[analytics] recordEvent(${eventName}) error:`, e);
  }
}

/**
 * Records a funnel event for an EXPLICIT session id (used where the request
 * carries no browser cookies — e.g. the PhonePe server-to-server callback).
 * Falls back gracefully when no session id is available.
 */
export async function recordEventForSession(
  eventName: string,
  sessionId: string | null | undefined,
  opts: { productId?: string; orderId?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    if (!sessionId) return;
    const admin = createAdminClient();
    await admin.from('analytics_events').insert({
      session_id: sessionId,
      event_name: eventName,
      product_id: opts.productId ?? null,
      order_id: opts.orderId ?? null,
      metadata: opts.metadata ?? {},
    });
  } catch (e) {
    console.error(`[analytics] recordEventForSession(${eventName}) error:`, e);
  }
}

function cleanTouch(t: AttributionTouch | undefined): AttributionTouch {
  return t
    ? {
        source: t.source,
        medium: t.medium,
        campaign: t.campaign,
        content: t.content,
        ref: t.ref,
        landingPath: t.landingPath,
      }
    : {};
}

/**
 * Historical attribution snapshot stored on the order at creation time.
 * Immutable per order — later session changes never alter it.
 */
export async function buildOrderAttribution() {
  const ctx = await getSessionContext();
  return {
    session_id: ctx.sessionId ?? null,
    first_touch: cleanTouch(ctx.attribution.f),
    last_touch: cleanTouch(ctx.attribution.l),
  };
}
