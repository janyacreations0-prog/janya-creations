import type { SizeOption } from '@/types';

/** Universal option label — available for every product category. */
export const FREE_SIZE = 'Free Size';

/**
 * Reads the size/option list stored in products.attributes.sizes.
 * Each entry is { value, stock }; "Free Size" is just another value.
 * Empty/malformed attributes yield no options (variants disabled).
 */
export function parseSizes(attributes?: Record<string, unknown> | null): SizeOption[] {
  if (!attributes || typeof attributes !== 'object') return [];
  const raw = (attributes as Record<string, unknown>)['sizes'];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => {
      const stock = Number(s.stock);
      return {
        value: String(s.value ?? '').trim(),
        stock: Number.isFinite(stock) && stock > 0 ? Math.floor(stock) : 0,
      };
    })
    .filter((s) => s.value.length > 0);
}

/** True when the product offers at least one size/option. */
export function hasSizes(attributes?: Record<string, unknown> | null): boolean {
  return parseSizes(attributes).length > 0;
}

/** First in-stock size, falling back to the first size, or null if none. */
export function defaultSizeOption(sizes: SizeOption[] | undefined | null): SizeOption | null {
  if (!sizes || sizes.length === 0) return null;
  return sizes.find((s) => s.stock > 0) ?? sizes[0];
}
