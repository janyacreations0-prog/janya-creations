import { SITE_URL } from '@/lib/seo';

/**
 * Reel template definitions + deterministic caption/tracking generation.
 * Uses ONLY verified product data (never invents claims).
 */

export type ReelTemplate = 'product_spotlight' | 'price_value' | 'styling' | 'new_arrival' | 'collection';

export interface ReelTemplateDef {
  key: ReelTemplate;
  label: string;
  description: string;
  hooks: string[];
  /** Whether the destination is the product page (true) or a category (false). */
  productDestination: boolean;
}

export const REEL_TEMPLATES: ReelTemplateDef[] = [
  {
    key: 'product_spotlight',
    label: 'Product Spotlight',
    description: 'Drive traffic to the exact product page',
    hooks: ['Simple. Elegant. ✨', 'One look and you will want it.', 'Made to be noticed ✨'],
    productDestination: true,
  },
  {
    key: 'price_value',
    label: 'Price / Value',
    description: 'Conversion focused — shows real price',
    hooks: ['Beautiful and affordable ✨', 'A little luxury without the big price.', 'Worth every rupee 💛'],
    productDestination: true,
  },
  {
    key: 'styling',
    label: 'Styling',
    description: 'Discovery + saves/shares',
    hooks: ['One piece that elevates your everyday look ✨', 'The finishing touch you didn’t know you needed.', 'Easy styling, effortless elegance ✨'],
    productDestination: true,
  },
  {
    key: 'new_arrival',
    label: 'New Arrival',
    description: 'New-product discovery',
    hooks: ['Just arrived at Janya Creations ✨', 'New in — and already a favourite.', 'Fresh from the collection ✨'],
    productDestination: true,
  },
  {
    key: 'collection',
    label: 'Collection',
    description: 'Show multiple products → category traffic',
    hooks: ['A collection you’ll want to see ✨', 'Jewellery you’ll love to browse.', 'Curated just for you ✨'],
    productDestination: false,
  },
];

export interface ReelProductInput {
  id: string | number;
  title: string;
  price: number;
  original_price?: number | null;
  categoryName?: string | null;
  /** Leaf category slug (used for collection destination). */
  categorySlug?: string | null;
  /** Parent category slug — collection URL uses the nested canonical path. */
  categoryParentSlug?: string | null;
}

export interface GeneratedCaption {
  caption: string;
  hashtags: string[];
  hook: string;
  cta: string;
}

const HASHTAG_POOL: Record<string, string[]> = {
  brand: ['#JanyaCreations'],
  jewellery: ['#ArtificialJewellery', '#JewelleryLover'],
  clothing: ['#IndianFashion', '#FashionDaily'],
  accessories: ['#AccessoriesStyle'],
  toys: ['#KidsToys', '#ToyStore'],
  generic: ['#IndianFashion', '#ShopOnline'],
};

function discountPct(product: ReelProductInput): number | null {
  const mrp = Number(product.original_price) || 0;
  const price = Number(product.price) || 0;
  if (mrp > 0 && price > 0 && price < mrp) {
    return Math.round(((mrp - price) / mrp) * 100);
  }
  return null;
}

function relevantHashtags(product: ReelProductInput, template: ReelTemplate): string[] {
  const tags = new Set<string>(HASHTAG_POOL.brand);
  const cat = (product.categoryName || '').toLowerCase();
  if (cat.includes('jewell')) HASHTAG_POOL.jewellery.forEach((h) => tags.add(h));
  if (cat.includes('clothing') || cat.includes('wear')) HASHTAG_POOL.clothing.forEach((h) => tags.add(h));
  if (cat.includes('accessor')) HASHTAG_POOL.accessories.forEach((h) => tags.add(h));
  if (cat.includes('toy')) HASHTAG_POOL.toys.forEach((h) => tags.add(h));
  if (tags.size <= 1) HASHTAG_POOL.generic.forEach((h) => tags.add(h));
  // Keep it small and relevant — never spam.
  return [...tags].slice(0, 6);
}

function destinationFor(
  product: ReelProductInput,
  template: ReelTemplate
): { destinationUrl: string; destinationLabel: string } {
  if (template === 'collection') {
    const slug = product.categorySlug;
    const parentSlug = product.categoryParentSlug;
    const url = slug && parentSlug
      ? `${SITE_URL}/category/${parentSlug}/${slug}`
      : slug
        ? `${SITE_URL}/category/${slug}`
        : `${SITE_URL}/shop`;
    return { destinationUrl: url, destinationLabel: 'Explore the collection' };
  }
  return { destinationUrl: `${SITE_URL}/products/${product.id}`, destinationLabel: 'Shop now' };
}

/** Campaign tracking URL compatible with the Phase 1 attribution system. */
export function trackingUrlFor(product: ReelProductInput, template: ReelTemplate, reelId: string): string {
  const base = destinationFor(product, template).destinationUrl;
  const params = new URLSearchParams({
    utm_source: 'instagram',
    utm_medium: 'organic_social',
    utm_campaign: 'reels',
    utm_content: `reel_${reelId}`,
    ref: `reel_${reelId}`,
  });
  return `${base}${base.includes('?') ? '&' : '?'}${params.toString()}`;
}

/**
 * Deterministic caption generation from verified product data. Hook rotates
 * deterministically by version so regenerations differ without randomness.
 */
export function generateReelCaption(
  product: ReelProductInput,
  template: ReelTemplate,
  reelId: string,
  version = 1
): GeneratedCaption {
  const def = REEL_TEMPLATES.find((t) => t.key === template) ?? REEL_TEMPLATES[0];
  const hook = def.hooks[(version - 1) % def.hooks.length];
  const price = Number(product.price) || 0;
  const priceText = price > 0 ? `₹${price.toLocaleString('en-IN')}` : '';
  const pct = discountPct(product);
  const { destinationLabel } = destinationFor(product, template);
  const tracking = trackingUrlFor(product, template, reelId);

  const lines: string[] = [];
  lines.push(`${hook}`);
  lines.push('');
  lines.push(product.title);

  if (template === 'price_value' && priceText) {
    lines.push(priceText);
    if (pct) lines.push(`${pct}% off — limited offer`);
  } else if (template === 'new_arrival') {
    lines.push('New at Janya Creations');
    if (priceText) lines.push(priceText);
  } else if (template === 'product_spotlight' || template === 'styling') {
    if (priceText) lines.push(priceText);
  } else if (template === 'collection') {
    lines.push('Browse the full collection online.');
  }

  lines.push('');
  lines.push(`Shop online at Janya Creations — ${destinationLabel}.`);
  lines.push(tracking);
  lines.push('');
  lines.push(relevantHashtags(product, template).join(' '));

  return {
    caption: lines.join('\n'),
    hashtags: relevantHashtags(product, template),
    hook,
    cta: destinationLabel,
  };
}

/** Deterministic recommended template for a product (Phase 2 rules). */
export function recommendedTemplateFor(
  product: ReelProductInput & { createdAt?: string },
  categoryName?: string | null
): ReelTemplate {
  const pct = discountPct(product);
  if (pct && pct >= 10) return 'price_value';
  const cat = (categoryName || '').toLowerCase();
  if (cat.includes('jewell') || cat.includes('accessor')) return 'product_spotlight';
  if (cat.includes('wear') || cat.includes('clothing')) return 'styling';
  if (product.createdAt && Date.now() - new Date(product.createdAt).getTime() < 14 * 86400000) {
    return 'new_arrival';
  }
  return 'product_spotlight';
}
