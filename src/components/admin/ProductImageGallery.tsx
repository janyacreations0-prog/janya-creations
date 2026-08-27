'use client';

import { useRef, useState } from 'react';
import {
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';
import { uploadImageSet } from '@/lib/image-upload';

export interface GalleryImage {
  key: string;
  original: string;
  large: string;
  medium: string;
  thumbnail: string;
}

interface ProductImageGalleryProps {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  folder?: string;
  max?: number;
}

const MAX_IMAGES = 4;

export default function ProductImageGallery({
  images,
  onChange,
  folder = 'products',
  max = MAX_IMAGES,
}: ProductImageGalleryProps) {
  const [uploading, setUploading] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slots = Array.from({ length: max }, (_, i) => images[i] || null);
  const remaining = max - images.length;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const addCount = Math.min(files.length, remaining);
    if (addCount === 0) {
      setError(`Maximum ${max} images allowed. Remove one first.`);
      return;
    }

    setError('');
    setUploading({ current: 0, total: addCount });

    let currentGallery = [...images];
    let hasError = false;

    for (let i = 0; i < addCount; i++) {
      const file = files[i];
      setUploading({ current: i + 1, total: addCount });
      try {
        const urls = await uploadImageSet(file, folder);
        currentGallery = [
          ...currentGallery,
          {
            key: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
            ...urls,
          },
        ];
        onChange(currentGallery);
      } catch (err: any) {
        console.error('Upload error:', err);
        setError(err?.message || `Failed to upload image ${i + 1}`);
        hasError = true;
      }
    }

    setUploading(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // If all files failed, still show the error; if some succeeded, the
    // already-uploaded images are preserved in the gallery.
    if (!hasError && addCount === files.length) {
      // Clear transient error after a short delay when all succeeded.
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRemove = (key: string) => {
    onChange(images.filter((img) => img.key !== key));
  };

  const handleMove = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {slots.map((img, i) => (
          <div
            key={img ? img.key : `empty-${i}`}
            className="relative aspect-square rounded-lg overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"
          >
            {img ? (
              <>
                <img
                  src={img.medium || img.large}
                  alt={`Product image ${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    <Star className="w-2.5 h-2.5 fill-current" /> Main
                  </span>
                )}
                <span className="absolute top-1.5 right-1.5 bg-black/60 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(img.key)}
                  aria-label={`Remove image ${i + 1}`}
                  title="Remove this image"
                  className="absolute bottom-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {images.length > 1 && (
                  <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(i, -1)}
                      disabled={i === 0}
                      aria-label={`Move image ${i + 1} left`}
                      title="Move image left"
                      className="bg-white/90 text-gray-700 rounded-full p-1 hover:bg-white transition shadow-sm disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(i, 1)}
                      disabled={i === images.length - 1}
                      aria-label={`Move image ${i + 1} right`}
                      title="Move image right"
                      className="bg-white/90 text-gray-700 rounded-full p-1 hover:bg-white transition shadow-sm disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading !== null}
                className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-amber-600 hover:border-amber-300 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-inset"
                aria-label={`Add image ${i + 1}`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-[10px]">Uploading...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Add Image {i + 1}</span>
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          {images.length === 0 ? (
            <p className="text-xs text-gray-500">No images yet — add up to {max}.</p>
          ) : (
            <p className="text-xs text-gray-500">
              {images.length} of {max} image{images.length !== 1 ? 's' : ''} • first image is the main product photo
            </p>
          )}
          {remaining > 0 && !uploading && (
            <p className="text-[11px] text-gray-400 mt-1">
              Select multiple images at once — {remaining} slot{remaining !== 1 ? 's' : ''} remaining.
            </p>
          )}
        </div>

        {remaining > 0 && uploading === null && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Images{remaining > 1 ? ` (max ${remaining})` : ''}
          </button>
        )}

        {uploading && (
          <span className="text-xs text-gray-500 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Uploading image {uploading.current} of {uploading.total}...
          </span>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
