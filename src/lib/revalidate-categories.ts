'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

/**
 * Revalidates the root layout (which contains the Navbar) and all category-
 * related cache tags. Call this after any admin mutation to categories,
 * subcategories, or attribute_schema so that the storefront reflects the
 * change immediately rather than waiting for the next ISR revalidation window.
 *
 * Safe to call multiple times — successive calls are idempotent.
 */
export async function revalidateCategoryData() {
  // The layout spans every route, so invalidating it refreshes the Navbar
  // and all other layout-driven category data (footer, breadcrumbs, etc.).
  revalidatePath('/', 'layout');
  revalidateTag('categories');
}