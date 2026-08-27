import { supabase } from './supabase';

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
  material?: string;
  plating?: string;
  is_featured?: boolean;
  is_new_arrival?: boolean;
  in_stock?: boolean;
  stock_quantity?: number;
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
  return (data as Product) || null;
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