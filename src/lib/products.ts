import { supabase } from './supabase';
import { parseSizes } from '@/lib/sizes';
import type { SizeOption } from '@/types';

export interface Product {
  id: string | number;
  title: string;
  name?: string;
  slug?: string;
  description?: string;
  category: string;
  category_id?: string | null;
  attributes?: Record<string, unknown>;
  price: number;
  original_price: number | null;
  discount_price?: number | null;
  badge: string | null;
  image_url: string;
  image?: string;
  image_large?: string;
  image_medium?: string;
  image_thumbnail?: string;
  images?: string[];
  /** Up to 4 gallery image sets from the product_images table (position 0-3). */
  gallery?: ProductGalleryItem[];
  /** Optional size/option list (e.g. ["S","M","L","Free Size"] + stock). */
  sizes?: SizeOption[];
  material?: string;
  plating?: string;
  is_featured?: boolean;
  is_new_arrival?: boolean;
  in_stock?: boolean;
  stock_quantity?: number;
}

/** A single gallery image set stored in public.product_images. */
export interface ProductGalleryItem {
  original?: string | null;
  large?: string | null;
  medium?: string | null;
  thumbnail?: string | null;
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', JSON.stringify(error, null, 2), error.message);
  return [];
  }

  return data || [];
}

/**
 * Fetches a small set of the newest products for the homepage (server-side).
 * Only listing fields are projected — no SELECT *.
 */
export async function getFeaturedProducts(limit = 12): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, title, name, price, original_price, category_id, category, image_thumbnail, image_url, badge, stock_quantity, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Error fetching featured products:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Fetches a single product by id — a targeted lookup (no full-table scan).
 * Projects the columns the product detail page actually uses.
 */
export async function getProductById(id: string): Promise<Product | null> {
  if (!id) return null;
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, title, name, price, original_price, badge, description, image_url, image_large, image_medium, image_thumbnail, category, category_id, attributes, stock_quantity, rating, sold, created_at'
    )
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('Error fetching product:', error.message);
    return null;
  }
  const product = (data as Product) || null;

  // Attach the up-to-4 gallery images (public product_images table), ordered by
  // position. Falls back to the legacy single-image columns if none exist.
  if (product) {
    const { data: galleryData, error: galleryError } = await supabase
      .from('product_images')
      .select('original_url, large_url, medium_url, thumbnail_url')
      .eq('product_id', id)
      .order('position', { ascending: true });
    if (galleryError) {
      console.error('Error fetching product gallery:', galleryError.message);
    } else if (galleryData && galleryData.length > 0) {
      product.gallery = galleryData.map((g: any) => ({
        original: g.original_url,
        large: g.large_url,
        medium: g.medium_url,
        thumbnail: g.thumbnail_url,
      }));
    }
  }

  return product;
}

/**
 * Fetches products by a list of ids (used by the cart/wishlist to resolve
 * current product data).
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids || ids.length === 0) return [];
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('id', ids);
  if (error) {
    console.error('Error fetching products by ids:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Normalises a raw row from the products table into the shape expected by
 * ProductCard, ProductActions, and other storefront components.
 * Matches the mapping used by the home page.
 * Card images prefer the small image_thumbnail (300px) over the large
 * image_url (1200px) to keep listing bandwidth low.
 */
export function toProductCard(raw: any): any {
  const title = raw.title || raw.name || 'Untitled Product';
  const cardImage = raw.image_thumbnail || raw.image_url || '/placeholder.jpg';
  return {
    id: String(raw.id),
    title,
    slug: raw.slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    price: raw.original_price || raw.price || 0,
    discount_price: raw.price || 0,
    material: raw.material || raw.category || 'Jewellery',
    plating: raw.plating || raw.badge || '',
    images: raw.images?.length ? raw.images : [cardImage],
    image_thumbnail: cardImage,
    image_url: raw.image_url,
    sizes: parseSizes(raw.attributes),
    category: raw.category,
    category_id: raw.category_id ?? null,
    attributes: raw.attributes ?? {},
    stock_quantity: raw.stock_quantity ?? 0,
    in_stock: raw.in_stock ?? ((raw.stock_quantity ?? 0) > 0),
    is_featured: raw.is_featured ?? true,
    is_new_arrival: raw.is_new_arrival ?? true,
  };
}

/**
 * Fetches products for a set of category ids, paginated at the DATABASE level.
 * Projects only listing fields. Returns the page of products plus the total
 * matching count (for pagination UI).
 */
export async function getProductsByCategoryIds(
  categoryIds: string[],
  options?: { from?: number; to?: number }
): Promise<{ products: Product[]; count: number }> {
  if (!categoryIds || categoryIds.length === 0) return { products: [], count: 0 };

  let query = supabase
    .from('products')
    .select(
      'id, title, name, price, original_price, category_id, category, image_thumbnail, image_url, badge, stock_quantity, created_at',
      { count: 'exact' }
    )
    .in('category_id', categoryIds)
    .order('created_at', { ascending: false });

  if (options && options.from !== undefined && options.to !== undefined) {
    query = query.range(options.from, options.to);
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('Error fetching products by category:', error.message);
    return { products: [], count: 0 };
  }
  return { products: data || [], count: count || 0 };
}

// Projected listing fields used by recommendations (no SELECT *).
const SIMILAR_PRODUCT_PROJECTION =
  'id, title, name, price, original_price, category_id, category, image_thumbnail, image_url, badge, stock_quantity, created_at';

/**
 * Fetches similar products for a product detail page.
 * Priority: same subcategory (leaf category) → fall back to the parent
 * category's subcategories. Prefers in-stock products, excludes the current
 * product, and is a limited, projected query (no full-table scan).
 */
export async function getSimilarProducts(
  product: { id: string; category_id?: string | null },
  limit = 8
): Promise<Product[]> {
  const currentId = String(product.id);
  const leafId = product.category_id ? String(product.category_id) : null;
  if (!leafId || limit <= 0) return [];

  const run = async (categoryIds: string[], inStockOnly: boolean, take: number) => {
    if (categoryIds.length === 0 || take <= 0) return [] as Product[];
    let query = supabase
      .from('products')
      .select(SIMILAR_PRODUCT_PROJECTION)
      .in('category_id', categoryIds)
      .neq('id', currentId);
    if (inStockOnly) query = query.gt('stock_quantity', 0);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(take);
    if (error) {
      console.error('Error fetching similar products:', error.message);
      return [] as Product[];
    }
    return (data || []) as Product[];
  };

  const mergeUnique = (list: Product[], extra: Product[]) => {
    const seen = new Set(list.map((p) => String(p.id)));
    const out = [...list];
    for (const p of extra) {
      if (!seen.has(String(p.id))) {
        seen.add(String(p.id));
        out.push(p);
      }
    }
    return out;
  };

  // Resolve the parent (top-level) category for fallback.
  let parentId: string | null = null;
  const { data: leafCat } = await supabase
    .from('categories')
    .select('id, parent_id')
    .eq('id', leafId)
    .maybeSingle();
  parentId = leafCat?.parent_id ? String(leafCat.parent_id) : null;

  // 1) Same subcategory — in stock first, then fill from any stock.
  let similar = await run([leafId], true, limit);
  if (similar.length < limit) {
    similar = mergeUnique(similar, await run([leafId], false, limit));
  }

  // 2) Fall back to the parent category if we still have too few.
  if (similar.length < 4 && parentId) {
    const { data: siblings } = await supabase
      .from('categories')
      .select('id')
      .eq('parent_id', parentId);
    const siblingIds = (siblings || []).map((c: any) => String(c.id));
    const parentList = mergeUnique(
      await run(siblingIds, true, limit),
      await run(siblingIds, false, limit)
    );
    similar = mergeUnique(similar, parentList);
  }

  return similar.slice(0, limit);
}

/** Lightweight product metadata for SEO/structured-data (projected query). */
const SEO_PRODUCT_PROJECTION =
  'id, title, name, price, original_price, badge, description, image_url, image_large, image_medium, image_thumbnail, category, category_id, stock_quantity, created_at';

export interface ProductSeoData {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  badge: string | null;
  description: string | null;
  images: string[];
  inStock: boolean;
  category_id: string | null;
  category: string;
}

export async function getProductSeoData(id: string): Promise<ProductSeoData | null> {
  if (!id) return null;
  const { data, error } = await supabase
    .from('products')
    .select(SEO_PRODUCT_PROJECTION)
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;

  const raw = data as any;
  const image =
    raw.image_large || raw.image_medium || raw.image_url || '';
  return {
    id: String(raw.id),
    title: String(raw.title || raw.name || ''),
    price: Number(raw.price) || 0,
    original_price: raw.original_price,
    badge: raw.badge,
    description: raw.description || null,
    images: image ? [image] : [],
    inStock: (raw.stock_quantity ?? Infinity) > 0,
    category_id: raw.category_id,
    category: raw.category,
  };
}