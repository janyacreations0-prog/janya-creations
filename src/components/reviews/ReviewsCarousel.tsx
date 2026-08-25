'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Star, BadgeCheck } from 'lucide-react';
import type { HomepageReview } from '@/lib/reviews';

interface ReviewsCarouselProps {
  reviews: HomepageReview[];
}

const CARD_GAP = 16;

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

/**
 * Auto-scrolling review carousel.
 * - Smooth auto-advance, pauses on hover/focus and when the tab is hidden.
 * - Respects prefers-reduced-motion (no auto-advance; manual scroll only).
 * - Touch-friendly (snap scrolling) and clipped (no page overflow).
 * - Subtle previous/next controls.
 */
export default function ReviewsCarousel({ reviews }: ReviewsCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (paused || reducedMotion.current || reviews.length <= 1) return;

    const onVisibility = () => setPaused(document.hidden);

    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const card = el.querySelector<HTMLElement>('[data-review-card]');
      if (!card) return;
      const step = card.offsetWidth + CARD_GAP;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, 3200);

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [paused, reviews.length]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-review-card]');
    const step = card ? card.offsetWidth + CARD_GAP : 320;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((r) => (
          <div
            key={r.id}
            data-review-card
            className="snap-start shrink-0 w-[80vw] sm:w-[320px] md:w-[340px] bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex flex-col"
          >
            <Stars rating={r.rating} />
            <p className="text-sm text-gray-700 leading-relaxed mt-3 line-clamp-4 flex-1">
              &ldquo;{r.review_text || ''}&rdquo;
            </p>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{r.customer_name}</p>
              <div className="flex items-center gap-2 mt-1">
                {r.is_verified_purchase && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified Purchase
                  </span>
                )}
                {r.product_name && (
                  <span className="text-[11px] text-gray-400 truncate min-w-0">
                    {r.product_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {reviews.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            aria-label="Previous reviews"
            className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            aria-label="Next reviews"
            className="p-2 rounded-full border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
