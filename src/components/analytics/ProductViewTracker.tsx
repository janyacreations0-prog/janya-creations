'use client';

import { useEffect, useRef } from 'react';
import { trackProductView } from '@/lib/analytics-actions';

/**
 * Records a single `product_view` event per product per browser session
 * (guarded by sessionStorage) so re-renders / revalidation never duplicate it.
 */
export default function ProductViewTracker({ productId }: { productId: string }) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    const key = `jc_pv_${productId}`;
    if (window.sessionStorage.getItem(key)) return;
    firedRef.current = true;
    window.sessionStorage.setItem(key, '1');
    void trackProductView(productId).catch(() => {});
  }, [productId]);

  return null;
}
