'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ProductGalleryImage {
  key: string;
  large?: string;
  medium?: string;
  thumbnail?: string;
  alt: string;
}

interface ProductImageGalleryProps {
  images: ProductGalleryImage[];
  alt: string;
}

const PLACEHOLDER = '/images/placeholder.jpg';

/**
 * Storefront product image gallery.
 * - Shows the main image with Previous/Next navigation and a thumbnail strip.
 * - Renders a single-image layout (no controls) when only one image exists.
 * - Main image uses the large/medium URL; thumbnails use thumbnail/medium URLs
 *   to keep bandwidth low.
 * - No download action; keyboard-accessible buttons with visible focus.
 */
export default function ProductImageGallery({ images, alt }: ProductImageGalleryProps) {
  const count = images.length;
  const [active, setActive] = useState(0);

  const current = images[active];
  const mainSrc = current?.large || current?.medium || PLACEHOLDER;
  const thumbSrc = (img: ProductGalleryImage) => img?.thumbnail || img?.medium || PLACEHOLDER;

  const goPrev = useCallback(() => setActive((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setActive((i) => Math.min(count - 1, i + 1)), [count]);

  const mainImage = (current?: ProductGalleryImage) => (
    <Image
      src={mainSrc}
      alt={current?.alt || alt}
      fill
      priority={active === 0}
      sizes="(max-width: 768px) 100vw, 50vw"
      className="object-cover"
    />
  );

  return (
    <div>
      {/* Main image (fixed aspect ratio prevents layout shift) */}
      <div className="relative aspect-square w-full bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
        {mainImage(current)}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              disabled={active === 0}
              aria-label="Previous image"
              title="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-sm border border-gray-200 transition disabled:opacity-35 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={active === count - 1}
              aria-label="Next image"
              title="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-sm border border-gray-200 transition disabled:opacity-35 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip (only when more than one image) */}
      {count > 1 && (
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1" role="group" aria-label="Product image thumbnails">
          {images.map((img, i) => {
            const isActive = i === active;
            return (
              <button
                key={img.key}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1} of ${count}`}
                aria-current={isActive ? 'true' : undefined}
                title={`Image ${i + 1} of ${count}`}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 ${
                  isActive ? 'border-rose-500' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Image
                  src={thumbSrc(img)}
                  alt={`${alt} thumbnail ${i + 1}`}
                  fill
                  loading="lazy"
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
