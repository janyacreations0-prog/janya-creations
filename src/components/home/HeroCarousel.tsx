'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HeroSlide, HeroSlideProduct } from '@/lib/homepage';

interface HeroCarouselProps {
  slides: HeroSlide[];
}

/**
 * Primary product image for one hero slide.
 * Source images are square (1:1), so a square container + object-cover shows
 * the complete product with no cropping.
 * - Desktop: image fills the hero height, right-aligned, rounded on the left edge.
 * - Mobile: one large centered square image.
 * No companion/peeking images — only the primary product.
 */
function SlideImage({ product, priority = false }: { product: HeroSlideProduct; priority?: boolean }) {
  const src = product.image_large || product.image_medium || '/images/placeholder.jpg';

  return (
    <div className="relative w-full h-full flex items-center justify-center sm:justify-end">
      <div className="relative w-[88%] max-w-[380px] aspect-square sm:w-auto sm:max-w-none sm:h-full overflow-hidden rounded-2xl sm:rounded-l-2xl lg:rounded-l-3xl shadow-2xl">
        <Image
          src={src}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 640px) 88vw, (max-width: 1024px) 45vw, 34vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartRef = useRef(0);

  const count = slides.length;
  if (count === 0) return null;

  // Auto-rotate every 5 s, paused while hovered or interacting.
  useEffect(() => {
    if (paused || count <= 1) return;
    timerRef.current = setInterval(() => {
      setActive((a) => (a + 1) % count);
    }, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, count]);

  const goTo = useCallback((i: number) => setActive(i), []);
  const goPrev = useCallback(() => setActive((a) => (a - 1 + count) % count), [count]);
  const goNext = useCallback(() => setActive((a) => (a + 1) % count), [count]);

  // Keyboard navigation (arrow keys when the carousel is focused).
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { goPrev(); setPaused(true); }
    if (e.key === 'ArrowRight') { goNext(); setPaused(true); }
  };

  // Touch / swipe.
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goNext() : goPrev();
      setPaused(true);
    }
  };

  const current = slides[active];

  return (
    <section
      className="relative w-full overflow-hidden bg-gradient-to-br from-rose-100/80 via-white to-rose-50"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured products carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative h-[500px] sm:h-[520px] lg:h-[540px]">
          {/* Slide content — keyed so each change cross-fades in */}
          <div
            key={active}
            className="grid grid-cols-1 lg:grid-cols-[42%_58%] gap-6 lg:gap-0 items-center h-full hero-slide-fade"
          >
            {/* Text panel — vertically centered, ~42% on desktop */}
            <div className="relative z-20 flex flex-col justify-center h-full text-center lg:text-left order-2 lg:order-1 py-6 lg:py-0">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600 mb-3">
                {current.label}
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-serif font-bold text-gray-900 leading-[1.12]">
                {current.heading}
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mt-4 max-w-md leading-relaxed mx-auto lg:mx-0">
                {current.description}
              </p>
              <div className="mt-7">
                <Link
                  href={current.link}
                  className="inline-flex items-center gap-2 px-9 py-3.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold tracking-widest uppercase rounded-md shadow-lg shadow-rose-600/20 transition-all"
                >
                  {current.cta}
                </Link>
              </div>
            </div>

            {/* Image panel — ~58%, fills hero height */}
            <div className="relative order-1 lg:order-2 h-full">
              <SlideImage product={current.products[0]} priority={active === 0} />
            </div>
          </div>
        </div>
      </div>

      {/* Previous / Next buttons */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => { goPrev(); setPaused(true); }}
            aria-label="Previous slide"
            className="absolute left-1.5 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-md border border-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 z-30"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            type="button"
            onClick={() => { goNext(); setPaused(true); }}
            aria-label="Next slide"
            className="absolute right-1.5 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-md border border-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 z-30"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {count > 1 && (
        <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30" role="tablist" aria-label="Slides">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Slide ${i + 1} of ${count}`}
              onClick={() => { goTo(i); setPaused(true); }}
              className={`w-2.5 h-2.5 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                i === active ? 'bg-rose-600 w-6' : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes heroSlideFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-slide-fade { animation: heroSlideFade 0.45s ease-out both; }
      `}</style>
    </section>
  );
}