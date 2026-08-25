'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_REVIEW_LENGTH = 1000;

export interface SubmitReviewResult {
  success: boolean;
  error?: string;
  mode?: 'created' | 'updated' | 'already_reviewed';
}

export interface ModerateReviewResult {
  success: boolean;
  error?: string;
}

/**
 * Authenticated review submission.
 * - user_id is always auth.uid() (never accepted from the browser).
 * - customer_name comes from the authenticated profile/session.
 * - product_id is validated server-side.
 * - status always starts as 'pending'.
 * - is_verified_purchase is computed server-side from the customer's own PAID
 *   orders (payment_status = 'paid' and the product in order_items) — it is
 *   never accepted from the browser. Inserts go through the service-role
 *   client so the server-computed flag persists.
 * - One review per customer per product (UNIQUE(user_id, product_id)); a
 *   pending review can be edited, approved/rejected cannot.
 */
export async function submitReview(input: {
  productId: string;
  rating: number;
  review_text: string;
}): Promise<SubmitReviewResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Please sign in to review a product.' };
    }

    const productId = String(input.productId || '').trim();
    if (!productId) {
      return { success: false, error: 'Invalid product.' };
    }

    const rating = Math.round(Number(input.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return { success: false, error: 'Rating must be between 1 and 5 stars.' };
    }

    const reviewText = String(input.review_text || '').trim();
    if (reviewText.length > MAX_REVIEW_LENGTH) {
      return {
        success: false,
        error: `Your review must be under ${MAX_REVIEW_LENGTH} characters.`,
      };
    }

    // Server-validate the product exists.
    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .maybeSingle();
    if (!product) {
      return { success: false, error: 'Product not found.' };
    }

    // Customer display name from the authenticated profile.
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();
    const customerName =
      (profile?.full_name as string) ||
      (user.user_metadata?.full_name as string) ||
      (user.email ? user.email.split('@')[0] : '') ||
      'Customer';

    // Verified purchase: a PAID order (owned by this user) containing the product.
    const { data: paidOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('payment_status', 'paid');
    let isVerifiedPurchase = false;
    if (paidOrders && paidOrders.length > 0) {
      const orderIds = paidOrders.map((o) => o.id);
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id')
        .in('order_id', orderIds)
        .eq('product_id', productId)
        .limit(1);
      isVerifiedPurchase = Boolean(items && items.length > 0);
    }

    // Only customers who purchased the product may submit a review.
    if (!isVerifiedPurchase) {
      return {
        success: false,
        error: 'You can review this product after purchasing it.',
      };
    }

    // Service-role client: reads/writes bypass RLS so the server-computed
    // verified flag can persist (customer RLS pins it to false).
    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('product_reviews')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'approved' || existing.status === 'rejected') {
        return { success: false, error: "You've already reviewed this product.", mode: 'already_reviewed' };
      }
      // Pending → editable update.
      const { error } = await admin
        .from('product_reviews')
        .update({
          rating,
          review_text: reviewText || null,
          is_verified_purchase: isVerifiedPurchase,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (error) {
        console.error('Review update failed:', error.message);
        return { success: false, error: 'Failed to update your review. Please try again.' };
      }
      return { success: true, mode: 'updated' };
    }

    const { error: insertError } = await admin.from('product_reviews').insert({
      product_id: productId,
      user_id: user.id,
      customer_name: customerName,
      rating,
      review_text: reviewText || null,
      status: 'pending',
      is_verified_purchase: isVerifiedPurchase,
    });
    if (insertError) {
      // UNIQUE(user_id, product_id) race → already reviewed.
      if (insertError.code === '23505') {
        return { success: false, error: "You've already reviewed this product.", mode: 'already_reviewed' };
      }
      console.error('Review insert failed:', insertError.message);
      return { success: false, error: 'Failed to submit your review. Please try again.' };
    }

    return { success: true, mode: 'created' };
  } catch (e) {
    console.error('submitReview error:', e);
    return { success: false, error: 'Unable to submit your review. Please try again.' };
  }
}

/**
 * Admin moderation — approve or reject a review. RLS (is_admin) protects this.
 */
export async function adminUpdateReviewStatus(
  reviewId: string,
  status: 'approved' | 'rejected'
): Promise<ModerateReviewResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role !== 'admin') {
      return { success: false, error: 'Admin access required.' };
    }

    const { error } = await supabase
      .from('product_reviews')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', reviewId);
    if (error) {
      console.error('Review moderation update failed:', error.message);
      return { success: false, error: 'Failed to update the review.' };
    }
    return { success: true };
  } catch (e) {
    console.error('adminUpdateReviewStatus error:', e);
    return { success: false, error: 'Failed to update the review.' };
  }
}

/**
 * Admin moderation — delete a review.
 */
export async function adminDeleteReview(reviewId: string): Promise<ModerateReviewResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated.' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role !== 'admin') {
      return { success: false, error: 'Admin access required.' };
    }

    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', reviewId);
    if (error) {
      console.error('Review delete failed:', error.message);
      return { success: false, error: 'Failed to delete the review.' };
    }
    return { success: true };
  } catch (e) {
    console.error('adminDeleteReview error:', e);
    return { success: false, error: 'Failed to delete the review.' };
  }
}
