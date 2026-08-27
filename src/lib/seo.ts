import { BUSINESS } from '@/lib/contact';

/**
 * Central SEO configuration — single source of truth for metadata, canonical
 * URLs and structured data. Keeps constants out of individual pages.
 */

export const SITE_NAME = BUSINESS.name;
export const SITE_URL = 'https://janyacreations.com';
export const SITE_LOCALE = 'en_IN';

export const DEFAULT_TITLE = `${SITE_NAME} — Artificial Jewellery, Women's Clothing & More`;
export const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

export const DEFAULT_DESCRIPTION =
  'Shop artificial jewellery, gold plated and anti-tarnish jewellery, women\'s clothing, accessories and toys at Janya Creations. Elegant pieces for every occasion.';

/** Real, stable internal-search query URL (used by WebSite SearchAction). */
export const SEARCH_QUERY_URL = `${SITE_URL}/shop?q={search_term_string}`;

/** Resolves a site-relative path to an absolute URL. */
export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export const openGraphDefaults = {
  siteName: SITE_NAME,
  locale: SITE_LOCALE,
  type: 'website' as const,
  url: SITE_URL,
};

/** Pages that must never be indexed (private/authenticated/customer areas). */
export const NOINDEX_ROBOTS = { index: false, follow: false } as const;

/** SEO pages that should be indexed but their query-variants must not be. */
export const INDEX_FOLLOW_ROBOTS = { index: true, follow: true } as const;

// ── JSON-LD builders ─────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  url: string;
}

/** Organization schema from real BUSINESS contact data only. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BUSINESS.name,
    url: SITE_URL,
    email: BUSINESS.email,
    telephone: BUSINESS.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${BUSINESS.address.line1}, ${BUSINESS.address.line2}`,
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.state,
      postalCode: BUSINESS.address.pincode,
      addressCountry: 'IN',
    },
  };
}

/** WebSite schema with a SearchAction pointing at the real /shop?q= search. */
export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BUSINESS.name,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: SEARCH_QUERY_URL,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** BreadcrumbList that must always mirror the visible breadcrumbs. */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export interface ProductSchemaInput {
  id: string | number;
  title: string;
  description?: string | null;
  images: string[];
  price: number;
  inStock: boolean;
  /** Approved-review average + count; omitted entirely when no reviews. */
  aggregateRating?: { average: number; count: number } | null;
}

/** Product schema using ONLY real values; aggregateRating only with reviews. */
export function productJsonLd(input: ProductSchemaInput) {
  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    url: absoluteUrl(`/products/${input.id}`),
    priceCurrency: 'INR',
    price: input.price,
    availability: input.inStock
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
  };

  const json: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.title,
    offers: offer,
  };

  if (input.description) json.description = input.description;
  if (input.images.length > 0) json.image = input.images;

  if (input.aggregateRating && input.aggregateRating.count > 0) {
    json.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: input.aggregateRating.average,
      reviewCount: input.aggregateRating.count,
    };
  }

  return json;
}
