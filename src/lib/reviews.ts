import { supabase } from './supabase';

export interface HomepageReview {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  product_name?: string;
}

export interface ProductReview {
  id: string;
  customer_name: string;
  rating: number;
  review_text: string | null;
  is_verified_purchase: boolean;
  created_at: string;
}

export interface ReviewSummary {
  average: number | null;
  count: number;
  distribution: Record<number, number>; // star 1..5 → count (approved only)
}

/**
 * THE shared approved-review query used by the homepage social-proof carousel
 * (and by the product review system). Fetches only the top N approved reviews:
 * verified purchases first, then highest rating, then most recent.
 * Returns [] on error or when there are no approved reviews.
 */
export async function getTopReviews(limit = 10): Promise<HomepageReview[]> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select(
      'id, customer_name, rating, review_text, is_verified_purchase, created_at, products(name)'
    )
    .eq('status', 'approved')
    .order('is_verified_purchase', { ascending: false })
    .order('rating', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching top reviews:', error.message);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    customer_name: r.customer_name,
    rating: r.rating,
    review_text: r.review_text,
    is_verified_purchase: r.is_verified_purchase,
    created_at: r.created_at,
    product_name: r.products?.name,
  }));
}

/**
 * Approved reviews for a single product (product detail page). Only approved
 * reviews are returned — pending/rejected are never public.
 */
export async function getProductReviews(
  productId: string,
  limit = 20
): Promise<ProductReview[]> {
  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, customer_name, rating, review_text, is_verified_purchase, created_at')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('is_verified_purchase', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('Error fetching product reviews:', error.message);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    customer_name: r.customer_name,
    rating: r.rating,
    review_text: r.review_text,
    is_verified_purchase: r.is_verified_purchase,
    created_at: r.created_at,
  }));
}

/**
 * Average rating / review count / star distribution computed ONLY from
 * approved reviews. Verified status does not affect the numerical average.
 */
export function computeReviewSummary(reviews: ProductReview[]): ReviewSummary {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  reviews.forEach((r) => {
    const star = Math.max(1, Math.min(5, Math.round(r.rating)));
    distribution[star] = (distribution[star] || 0) + 1;
    total += star;
  });
  const count = reviews.length;
  return {
    average: count > 0 ? Math.round((total / count) * 10) / 10 : null,
    count,
    distribution,
  };
}
