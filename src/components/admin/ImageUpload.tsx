'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, X, Image as ImageIcon, Loader2, Check } from 'lucide-react';

interface ImageUploadProps {
  onImageUploaded: (urls: {
    original: string;
    large: string;
    medium: string;
    thumbnail: string;
  }) => void;
  currentImage?: string;
  folder?: string;
}

export default function ImageUpload({ 
  onImageUploaded, 
  currentImage, 
  folder = 'products' 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optimize image with high quality preservation
  const optimizeImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<Blob> => {
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
          
          // Calculate new dimensions maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          // Enable high-quality image rendering
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
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 50MB for high quality)
    if (file.size > 50 * 1024 * 1024) {
      setError('Image must be less than 50MB');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);
    setUploaded(false);

    try {
      const baseFileName = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const uploadPromises = [];

      // 1. Generate and upload ORIGINAL (high quality, large size)
      setProgress(10);
      const originalBlob = await optimizeImage(file, 2000, 2000, 0.92);
      const originalPath = `${folder}/${baseFileName}-original.jpg`;
      uploadPromises.push(
        supabase.storage
          .from('product-images')
          .upload(originalPath, originalBlob, {
            cacheControl: '31536000',
            upsert: false,
            contentType: 'image/jpeg',
          })
      );

      // 2. Generate and upload LARGE (1200x1200px, high quality)
      setProgress(30);
      const largeBlob = await optimizeImage(file, 1200, 1200, 0.90);
      const largePath = `${folder}/${baseFileName}-large.jpg`;
      uploadPromises.push(
        supabase.storage
          .from('product-images')
          .upload(largePath, largeBlob, {
            cacheControl: '31536000',
            upsert: false,
            contentType: 'image/jpeg',
          })
      );

      // 3. Generate and upload MEDIUM (600x600px, good quality)
      setProgress(55);
      const mediumBlob = await optimizeImage(file, 600, 600, 0.85);
      const mediumPath = `${folder}/${baseFileName}-medium.jpg`;
      uploadPromises.push(
        supabase.storage
          .from('product-images')
          .upload(mediumPath, mediumBlob, {
            cacheControl: '31536000',
            upsert: false,
            contentType: 'image/jpeg',
          })
      );

      // 4. Generate and upload THUMBNAIL (300x300px, good quality)
      setProgress(75);
      const thumbnailBlob = await optimizeImage(file, 300, 300, 0.80);
      const thumbnailPath = `${folder}/${baseFileName}-thumbnail.jpg`;
      uploadPromises.push(
        supabase.storage
          .from('product-images')
          .upload(thumbnailPath, thumbnailBlob, {
            cacheControl: '31536000',
            upsert: false,
            contentType: 'image/jpeg',
          })
      );

      // Upload all versions
      const results = await Promise.all(uploadPromises);
      
      // Check for errors
      results.forEach((result) => {
        if (result.error) throw result.error;
      });

      setProgress(95);

      // Get public URLs
      const getPublicUrl = (path: string) => {
        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(path);
        return data.publicUrl;
      };

      const urls = {
        original: getPublicUrl(originalPath),
        large: getPublicUrl(largePath),
        medium: getPublicUrl(mediumPath),
        thumbnail: getPublicUrl(thumbnailPath),
      };

      setProgress(100);
      setPreview(urls.medium); // Show medium as preview
      setUploaded(true);
      onImageUploaded(urls);

      // Reset progress after 2 seconds
      setTimeout(() => {
        setProgress(0);
      }, 2000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setUploaded(false);
    onImageUploaded({
      original: '',
      large: '',
      medium: '',
      thumbnail: '',
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Image Preview */}
        {preview ? (
          <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 flex-shrink-0">
            <img
              src={preview}
              alt="Product preview"
              className="w-full h-full object-cover"
            />
            {uploaded && (
              <div className="absolute top-2 left-2 bg-green-500 text-white rounded-full p-1">
                <Check className="w-3 h-3" />
              </div>
            )}
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 flex-shrink-0">
            <ImageIcon className="w-10 h-10 text-gray-400" />
          </div>
        )}

        <div className="flex-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition disabled:opacity-50 font-medium"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {preview ? 'Change Image' : 'Upload Image'}
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 mt-2">
            PNG, JPG, WEBP (max 50MB)
          </p>
          
          <p className="text-xs text-gray-400 mt-1">
            ✓ High quality preserved • 4 sizes generated automatically
          </p>

          {uploading && progress > 0 && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Optimizing & uploading {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {uploaded && preview && (
        <div className="flex gap-4 text-xs text-gray-500">
          <span>✅ Uploaded successfully</span>
          <span>•</span>
          <span className="text-green-600">4 sizes generated</span>
        </div>
      )}
    </div>
  );
}