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
 */
export function toProductCard(raw: any): any {
  const title = raw.title || raw.name || 'Untitled Product';
  return {
    id: String(raw.id),
    title,
    slug: raw.slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    price: raw.original_price || raw.price || 0,
    discount_price: raw.price || 0,
    material: raw.material || raw.category || 'Jewellery',
    plating: raw.plating || raw.badge || '',
    images: raw.images?.length
      ? raw.images
      : [raw.image_url || '/placeholder.jpg'],
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
 * Fetches products whose category_id is in the given list of IDs.
 * Returns an empty array on error or when no IDs are provided.
 */
export async function getProductsByCategoryIds(categoryIds: string[]): Promise<Product[]> {
  if (!categoryIds || categoryIds.length === 0) return [];
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('category_id', categoryIds)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching products by category:', error.message);
    return [];
  }
  return data || [];
}