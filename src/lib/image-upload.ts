import { createClient } from '@/lib/supabase/client';

export interface UploadedImageSet {
  original: string;
  large: string;
  medium: string;
  thumbnail: string;
}

function optimizeImage(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');

        let width = img.width;
        let height = img.height;

        // Keep aspect ratio within the target bounds
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to optimize image'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

/**
 * Optimizes an image into 4 sizes (original/large/medium/thumbnail) and uploads
 * them to the `product-images` storage bucket. Returns the public URLs.
 * Browser-only (uses FileReader/Canvas); import from Client Components only.
 */
export async function uploadImageSet(file: File, folder = 'products'): Promise<UploadedImageSet> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('Image must be less than 50MB');
  }

  const supabase = createClient();
  const baseFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}`;

  const variants: { suffix: string; max: number; quality: number }[] = [
    { suffix: 'original', max: 2000, quality: 0.92 },
    { suffix: 'large', max: 1200, quality: 0.9 },
    { suffix: 'medium', max: 600, quality: 0.85 },
    { suffix: 'thumbnail', max: 300, quality: 0.8 },
  ];

  const uploaded = await Promise.all(
    variants.map(async (v) => {
      const blob = await optimizeImage(file, v.max, v.max, v.quality);
      const path = `${folder}/${baseFileName}-${v.suffix}.jpg`;
      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, blob, {
          cacheControl: '31536000',
          upsert: false,
          contentType: 'image/jpeg',
        });
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      return data.publicUrl;
    })
  );

  return {
    original: uploaded[0],
    large: uploaded[1],
    medium: uploaded[2],
    thumbnail: uploaded[3],
  };
}
