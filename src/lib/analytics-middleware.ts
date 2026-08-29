import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge-safe first-party attribution capture.
 *
 * Runs on every public page request and:
 *  1. Ensures an anonymous `jc_s` session cookie exists (UUID, HttpOnly,
 *     Secure in production, SameSite=Lax, 90-day lifetime, no PII).
 *  2. Stores FIRST-TOUCH attribution on the very first request, and updates
 *     LAST-TOUCH only when a new source arrives (UTM params, or an external
 *     referrer such as an organic search engine).
 *
 * No database access here — the visit row is created lazily by the server-side
 * analytics layer. Preserves the existing auth `updateSession` response.
 */

export const SESSION_COOKIE = 'jc_s';
export const ATTR_COOKIE = 'jc_a';
const TTL = 60 * 60 * 24 * 90;

const SEARCH_ENGINES = ['google', 'bing', 'duckduckgo', 'yahoo', 'yandex'];

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: TTL,
    path: '/',
  };
}

function parseAttr(raw?: string): { f?: Record<string, string>; l?: Record<string, string> } {
  if (!raw) return {};
  try {
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : {};
  } catch {
    return {};
  }
}

function utmTouch(
  source: string | null,
  medium: string | null,
  campaign: string | null,
  content: string | null,
  ref: string | null,
  landingPath: string
): Record<string, string> {
  const t: Record<string, string> = {};
  if (source) t.source = source;
  if (medium) t.medium = medium;
  if (campaign) t.campaign = campaign;
  if (content) t.content = content;
  if (ref) t.ref = ref;
  t.landingPath = landingPath;
  return t;
}

function refererTouch(referer: string | null): Record<string, string> | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    const host = url.hostname.replace(/^www\./, '');
    if (host.endsWith('janyacreations.com')) return null; // internal navigation
    const engine = SEARCH_ENGINES.find((s) => host.includes(s));
    return engine ? { source: engine, medium: 'organic' } : { source: host, medium: 'referral' };
  } catch {
    return null;
  }
}

export function applyAttribution(request: NextRequest, response: NextResponse): NextResponse {
  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;
  const attr = parseAttr(request.cookies.get(ATTR_COOKIE)?.value);

  if (!existingSession) {
    response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), cookieOptions());
  }

  const url = request.nextUrl;
  const sp = url.searchParams;
  const source = sp.get('utm_source');
  const medium = sp.get('utm_medium');
  const campaign = sp.get('utm_campaign');
  const content = sp.get('utm_content');
  const ref = sp.get('ref');
  const hasUtm = !!(source || medium || campaign || content || ref);
  const landingPath = url.pathname + url.search;
  const externalRef = hasUtm ? null : refererTouch(request.headers.get('referer'));

  let changed = false;
  if (!attr.f) {
    // First-ever touch for this session.
    attr.f = hasUtm
      ? utmTouch(source, medium, campaign, content, ref, landingPath)
      : externalRef
        ? { ...externalRef, landingPath }
        : { source: 'direct', landingPath };
    attr.l = { ...attr.f };
    changed = true;
  } else if (hasUtm || externalRef) {
    // New source arrived → update last-touch only (first-touch preserved).
    attr.l = hasUtm
      ? utmTouch(source, medium, campaign, content, ref, landingPath)
      : { ...externalRef, landingPath };
    changed = true;
  }

  if (changed) {
    response.cookies.set(ATTR_COOKIE, JSON.stringify(attr), cookieOptions());
  }

  return response;
}
