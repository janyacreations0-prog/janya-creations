'use client';

import React, { useEffect, useState } from 'react';
import { Star, BadgeCheck, MessageSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getProductReviews,
  computeReviewSummary,
  type ProductReview,
  type ReviewSummary,
} from '@/lib/reviews';
import { submitReview } from '@/lib/review-actions';

export default function ProductReviewsSection({
  productId,
}: {
  productId: string;
}) {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [sessionUser, setSessionUser] = useState<{ id: string } | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [myReview, setMyReview] = useState<{
    status: string;
    rating: number;
    review_text: string | null;
  } | null>(null);
  const [canReview, setCanReview] = useState(false); // paid purchase → eligible

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Load approved reviews for the product.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const r = await getProductReviews(productId);
      if (!mounted) return;
      setReviews(r);
      setSummary(computeReviewSummary(r));
      setLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, [productId]);

  // Load current user state (my review, eligibility).
  useEffect(() => {
    let mounted = true;
    const sup = createClient();
    (async () => {
      const {
        data: { session },
      } = await sup.auth.getSession();
      if (!mounted) return;
      const user = session?.user ?? null;
      setSessionUser(user);
      if (!user) {
        setCheckingUser(false);
        return;
      }

      // Own review (select_own policy allows reading own rows).
      const { data: mine } = await sup
        .from('product_reviews')
        .select('status, rating, review_text')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();
      if (!mounted) return;
      setMyReview(mine || null);
      if (mine) {
        setRating(mine.rating);
        setReviewText(mine.review_text || '');
      }

      // Eligibility: paid order containing this product.
      const { data: orders } = await sup
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('payment_status', 'paid');
      let eligible = false;
      if (orders && orders.length > 0) {
        const { data: items } = await sup
          .from('order_items')
          .select('order_id')
          .in('order_id', orders.map((o) => o.id))
          .eq('product_id', productId)
          .limit(1);
        eligible = Boolean(items && items.length > 0);
      }
      if (mounted) {
        setCanReview(eligible);
        setCheckingUser(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [productId]);

  const handleSubmit = async () => {
    setError('');
    setMessage('');
    setSubmitting(true);
    const res = await submitReview({
      productId,
      rating,
      review_text: reviewText,
    });
    setSubmitting(false);
    if (res.success) {
      setMessage('Thank you! Your review has been submitted and is awaiting approval.');
      setMyReview((prev) =>
        prev
          ? { ...prev, rating, review_text: reviewText }
          : { status: 'pending', rating, review_text: reviewText }
      );
      setEditMode(false);
    } else {
      setError(res.error || 'Failed to submit your review.');
    }
  };

  const starButton = (star: number) => (
    <button
      type="button"
      key={star}
      onClick={() => setRating(star)}
      onMouseEnter={() => setHoverRating(star)}
      onMouseLeave={() => setHoverRating(0)}
      className="p-1 -m-1 focus:outline-none"
      aria-label={`${star} star${star > 1 ? 's' : ''}`}
    >
      <Star
        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
          (hoverRating || rating) >= star
            ? 'fill-amber-400 text-amber-400'
            : 'text-gray-300'
        }`}
      />
    </button>
  );

  const renderStars = (r: number) => (
    <div className="flex gap-0.5" role="img" aria-label={`${r} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= r ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );

  // Determine what to show for the current user.
  const needsLogin = !sessionUser && !checkingUser;
  const cannotReview = sessionUser && !canReview && !myReview && !checkingUser;
  const alreadyReviewed = myReview && myReview.status !== 'pending';
  const showForm =
    sessionUser && !checkingUser && !alreadyReviewed && (canReview || myReview?.status === 'pending');
  const showEditPrompt = myReview?.status === 'pending' && !editMode;

  // --- UI ---
  return (
    <div className="border-t border-gray-200 pt-8 mt-8">
      <h2 className="text-lg font-serif font-bold text-gray-900 mb-6 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-rose-600" /> Customer Reviews
      </h2>

      {loaded && summary && summary.count > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <div className="text-center sm:text-left">
              <p className="text-4xl font-bold text-gray-900">
                {summary.average !== null ? summary.average.toFixed(1) : '—'}
              </p>
              {renderStars(Math.round(summary.average || 0))}
              <p className="text-xs text-gray-500 mt-1">{summary.count} review{summary.count !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary.distribution[star] || 0;
                const pct = summary.count > 0 ? (count / summary.count) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500 w-4 text-right">{star}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-gray-400 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Review cards */}
      {loaded && reviews.length > 0 ? (
        <div className="space-y-4 mb-8">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>{renderStars(r.rating)}</div>
                {r.is_verified_purchase && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 shrink-0">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mt-3">
                {r.review_text || ''}
              </p>
              <p className="text-xs text-gray-500 mt-3">{r.customer_name}</p>
            </div>
          ))}
        </div>
      ) : loaded ? (
        <p className="text-sm text-gray-500 mb-8">No reviews yet.</p>
      ) : null}

      {/* User-specific area */}
      {!loaded || checkingUser ? null : needsLogin ? (
        <p className="text-sm text-gray-500">
          <a href="/login" className="text-rose-600 hover:text-rose-700 font-medium">
            Sign in
          </a>{' '}
          to review this product.
        </p>
      ) : cannotReview ? (
        <p className="text-sm text-gray-500">
          You can review this product after purchasing it.
        </p>
      ) : alreadyReviewed ? (
        <p className="text-sm text-gray-500 font-medium">
          You&apos;ve already reviewed this product.
        </p>
      ) : showEditPrompt ? (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-4">
          <p className="text-sm text-amber-800 font-medium">
            Your review is pending approval.
          </p>
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="mt-2 text-sm text-rose-600 hover:text-rose-700 font-medium underline"
          >
            Edit Review
          </button>
        </div>
      ) : null}

      {/* Review form */}
      {showForm && (editMode || !showEditPrompt) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4"
        >
          <h3 className="text-sm font-semibold text-gray-900">
            {myReview ? 'Edit Your Review' : 'Write a Review'}
          </h3>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Rating
            </label>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map(starButton)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Review
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Share your experience with this product..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-y"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{reviewText.length}/1000</p>
          </div>

          {error && <p className="text-xs text-rose-600">{error}</p>}
          {message && <p className="text-xs text-emerald-700 font-medium">{message}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || rating < 1}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {submitting ? 'Submitting...' : myReview ? 'Update Review' : 'Submit Review'}
            </button>
            {myReview && (
              <button
                type="button"
                onClick={() => {
                  setEditMode(false);
                  setError('');
                  setMessage('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}