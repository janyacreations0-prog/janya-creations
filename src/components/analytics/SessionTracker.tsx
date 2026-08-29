'use client';

import { useEffect, useRef } from 'react';
import { trackVisit } from '@/lib/analytics-actions';

/**
 * Fires ONE visit event per browser session (guarded by sessionStorage).
 * The middleware already set the session + attribution cookies on first
 * load; this records the visit_sessions row so traffic is countable.
 */
export default function SessionTracker() {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (window.sessionStorage.getItem('jc_visit_tracked')) return;
    firedRef.current = true;
    window.sessionStorage.setItem('jc_visit_tracked', '1');
    void trackVisit().catch(() => {});
  }, []);

  return null;
}
