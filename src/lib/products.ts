import { supabase } from './supabase';

export interface Product {
  id: string | number;
  title: string;
  name?: string;
  slug?: string;
  description?: string;
  category: string;
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
