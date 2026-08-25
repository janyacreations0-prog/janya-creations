import { supabase } from '@/lib/supabase';
import type { ChatProductResult } from './types';

const MATERIAL_KEYWORDS = [
  'gold plated',
  'oxidised silver',
  'oxidized silver',
  'kundan',
  'alloy',
  'brass',
  'american diamond',
  'velvet',
  'cotton',
  'silk',
  'leather',
  'faux leather',
  'plastic',
  'wood',
];

const OCCASION_KEYWORDS = ['wedding', 'bridal', 'festive', 'party', 'office', 'casual'];

const TYPE_KEYWORDS: Record<string, string> = {
  earrings: 'earrings',
  necklace: 'necklace',
  necklaces: 'necklace',
  choker: 'necklace',
  chain: 'chain',
  bangle: 'bangles',
  bangles: 'bangles',
  bracelet: 'bracelet',
  bracelets: 'bracelet',
  ring: 'ring',
  anklet: 'anklet',
  saree: 'sarees',
  sarees: 'sarees',
  suit: 'suits',
  suits: 'suits',
  kurti: 'kurtis',
  lehengas: 'lehengas',
  dress: 'dresses',
  dupatta: 'dupattas',
  handbag: 'handbags',
  bag: 'handbags',
  clutch: 'clutches',
  wallet: 'wallets',
  belt: 'belts',
  'soft toy': 'soft-toys',
  doll: 'dolls',
};

function extractMaxPrice(q: string): number | null {
  const m = q.match(/(?:under|less than|below|upto|up to|max)\s*(?:rs\.?\s*|inr\s*|₹)?\s*(\d{2,})/i);
  return m ? Number(m[1]) : null;
}

function extractMinPrice(q: string): number | null {
  const m = q.match(/(?:over|above|more than|min|at least)\s*(?:rs\.?\s*|inr\s*|₹)?\s*(\d{2,})/i);
  return m ? Number(m[1]) : null;
}

function findMaterial(q: string): string | null {
  const hit = MATERIAL_KEYWORDS.find((k) => q.includes(k));
  return hit ? hit.toLowerCase() : null;
}

function findOccasion(q: string): string | null {
  const hit = OCCASION_KEYWORDS.find((k) => q.includes(k));
  return hit ? hit : null;
}

function findProductType(q: string): string | null {
  for (const [token, slug] of Object.entries(TYPE_KEYWORDS)) {
    if (q.includes(token)) return slug;
  }
  return null;
}

/**
 * Discovers products from the REAL catalog using parsed intents:
 * category/subcategory, product type, material, occasion and price.
 * Out-of-stock items are excluded unless the user explicitly asks for them.
 */
export async function searchCatalog(
  text: string
): Promise<{ products: ChatProductResult[]; note: string; matched: boolean }> {
  const q = text.toLowerCase();

  const typeSlug = findProductType(q);
  const maxPrice = extractMaxPrice(q);
  const minPrice = extractMinPrice(q);
  const material = findMaterial(q);
  const occasion = findOccasion(q);
  const wantOutOfStock = /\bout\s*of\s*stock\b|unavailable\b/.test(q);

  // Category resolution (top-level or subcategory) via the real categories table.
  const { data: cats } = await supabase.from('categories').select('id, name, slug, parent_id');
  const catsList = cats || [];
  let leafIds: string[] = [];
  let matchedCategoryName: string | null = null;

  if (typeSlug) {
    const sub = catsList.find((c: any) => c.slug === typeSlug);
    if (sub) {
      leafIds = [String(sub.id)];
      matchedCategoryName = sub.name;
    }
  }
  if (leafIds.length === 0) {
    // fall back to any category name mentioned in the text
    const mentioned = catsList.find(
      (c: any) => q.includes(String(c.name).toLowerCase()) || q.includes(String(c.slug))
    );
    if (mentioned) {
      leafIds = mentioned.parent_id
        ? [String(mentioned.id)]
        : [
            String(mentioned.id),
            ...catsList
              .filter((c: any) => String(c.parent_id) === String(mentioned.id))
              .map((c: any) => String(c.id)),
          ];
      matchedCategoryName = mentioned.name;
    }
  }

  // Server-side filters where practical; attribute/stock filtering in JS for
  // case-insensitive matching on the small catalog.
  let query = supabase
    .from('products')
    .select('id, title, name, price, image_url, category_id, attributes, stock_quantity');
  if (leafIds.length > 0) query = query.in('category_id', leafIds);
  if (maxPrice !== null) query = query.lte('price', maxPrice);
  if (minPrice !== null) query = query.gte('price', minPrice);

  const { data, error } = await query.limit(40);
  let rows = (data || []) as any[];
  if (error) {
    console.error('[chatbot] catalog search error:', error.message);
  }

  if (material) {
    rows = rows.filter(
      (r) => String((r.attributes || {}).material || '').toLowerCase() === material
    );
  }
  if (occasion) {
    rows = rows.filter((r) =>
      String((r.attributes || {}).occasion || '').toLowerCase().includes(occasion)
    );
  }
  if (!wantOutOfStock) {
    rows = rows.filter((r) => (r.stock_quantity ?? 0) > 0);
  }

  const products: ChatProductResult[] = rows.slice(0, 6).map((r) => ({
    id: String(r.id),
    title: r.title || r.name || 'Untitled Product',
    price: Number(r.price) || 0,
    image: r.image_url || null,
  }));

  const matched =
    products.length > 0 || leafIds.length > 0 || material !== null || occasion !== null || maxPrice !== null;

  let note = '';
  if (products.length > 0) {
    const bits: string[] = [];
    if (matchedCategoryName) bits.push(matchedCategoryName);
    if (material) bits.push(material);
    if (maxPrice !== null) bits.push(`under ₹${maxPrice}`);
    note = `Here are some${bits.length ? ` ${bits.join(', ')}` : ''} products that match:`;
  } else if (matched) {
    note = "I couldn't find products matching that combination. Try different terms like “earrings under ₹1000” or “gold plated chain”.";
  }

  return { products, note, matched };
}
