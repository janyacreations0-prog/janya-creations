import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper to merge Tailwind CSS classes safely
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format numbers into Indian Rupee currency format (e.g., ₹1,499)
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price);
}

// Calculate discount percentage (e.g., Original: ₹2000, Sale: ₹1500 -> 25% OFF)
export function calculateDiscount(originalPrice: number, discountPrice?: number | null): number {
  if (!discountPrice || discountPrice >= originalPrice) return 0;
  return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
}

// Convert string to URL slug (e.g., "Kundan Pearl Choker Set" -> "kundan-pearl-choker-set")
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-');     // Replace multiple - with single -
}

/**
 * Validates and normalises an Indian mobile number.
 * Accepts exactly 10 digits (first digit 6-9) or +91 followed by 10 digits.
 * Returns the clean 10-digit number on success, or null on failure.
 */
export function normalizeIndianPhone(input: string): string | null {
  const cleaned = input.replace(/[\s\-()]/g, '');
  // +91 followed by 10 digits
  if (/^\+91\d{10}$/.test(cleaned)) return cleaned.slice(3);
  // 10 digits, first digit 6-9
  if (/^[6-9]\d{9}$/.test(cleaned)) return cleaned;
  return null;
}