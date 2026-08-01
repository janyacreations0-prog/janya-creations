import { supabase } from './supabase';

export interface Product {
  id: string;
  title: string;
  category: string;
  price: number;
  original_price: number | null;
  badge: string | null;
  image_url: string;
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