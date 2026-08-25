'use client';

import { useEffect, useState } from 'react';
import { getTopReviews, type HomepageReview } from '@/lib/reviews';
import ReviewsCarousel from './ReviewsCarousel';

/**
 * Homepage social-proof section.
 * Renders nothing until loaded, and hides entirely when there are no approved
 * reviews (no empty cards, no fake testimonials).
 */
export default function ReviewsSection() {
  const [reviews, setReviews] = useState<HomepageReview[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    getTopReviews(10).then((r) => {
      if (!mounted) return;
      setReviews(r);
      setLoaded(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!loaded) return null;
  if (reviews.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h2 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 text-center">
        What Our Customers Say
      </h2>
      <p className="text-sm text-gray-500 text-center mt-2 mb-8">
        Genuine feedback from our customers
      </p>
      <ReviewsCarousel reviews={reviews} />
    </section>
  );
}
