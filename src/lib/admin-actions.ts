'use server';

import { createClient } from '@/lib/supabase/server';
import { mergeAttributeSchemas } from '@/lib/categories';
import type { CategoryAttributeDefinition } from '@/types';

export interface SaveProductGalleryImage {
  original: string;
  large: string;
  medium: string;
  thumbnail: string;
}

export interface SaveProductInput {
  id?: string;
  name: string;
  price: number;
  original_price?: number;
  badge?: string;
  category_id: string | null;
  stock_quantity: number;
  description: string;
  image_url: string;
  image_large: string;
  image_medium: string;
  image_thumbnail: string;
  /** Up to 4 gallery images persisted to product_images (position 0-3). */
  gallery?: SaveProductGalleryImage[];
  attributes: Record<string, unknown>;
  /** Legacy products.category text — written on CREATE only, never on update. */
  legacyCategoryName?: string;
}

/** Matches the auto-generated discount badge so edits recompute it. */
const AUTO_BADGE_PATTERN = /^\d+\s*%\s*OFF$/i;

function computeBadge(mrp: number, salePrice: number, manualBadge?: string): string | null {
  const pct =
    mrp > 0 && salePrice > 0 && salePrice < mrp
      ? Math.round(((mrp - salePrice) / mrp) * 100)
      : 0;
  const trimmed = manualBadge?.trim();
  if (trimmed && !AUTO_BADGE_PATTERN.test(trimmed)) {
    return trimmed;
  }
  return pct > 0 ? `${pct}% OFF` : null;
}

export interface SaveProductResult {
  success: boolean;
  error?: string;
  productId?: string;
}

function validateAttributes(
  attributes: unknown,
  schema: CategoryAttributeDefinition[]
): { ok: boolean; error?: string; clean?: Record<string, unknown> } {
  if (!schema || schema.length === 0) {
    if (attributes && typeof attributes === 'object' && Object.keys(attributes).length > 0) {
      return {
        ok: false,
        error: 'This category has no attributes configured. Remove the extra fields before saving.',
      };
    }
    return { ok: true, clean: {} };
  }

  if (typeof attributes !== 'object' || attributes === null || Array.isArray(attributes)) {
    return { ok: false, error: 'Attributes must be an object.' };
  }

  const attrObj = attributes as Record<string, unknown>;
  const schemaKeys = new Set(schema.map((s) => s.key));
  const unknownKeys = Object.keys(attrObj).filter((k) => !schemaKeys.has(k));
  if (unknownKeys.length > 0) {
    return { ok: false, error: `Unknown attribute key(s): ${unknownKeys.join(', ')}` };
  }

  const clean: Record<string, unknown> = {};
  for (const def of schema) {
    const value = attrObj[def.key];
    const isEmpty = value === undefined || value === null || value === '';

    if (isEmpty) {
      if (def.required) {
        return { ok: false, error: `"${def.label}" is required.` };
      }
      continue;
    }

    switch (def.type) {
      case 'text':
        if (typeof value !== 'string') {
          return { ok: false, error: `"${def.label}" must be text.` };
        }
        clean[def.key] = value.trim();
        break;
      case 'number': {
        const num = typeof value === 'number' ? value : Number(value);
        if (!Number.isFinite(num)) {
          return { ok: false, error: `"${def.label}" must be a number.` };
        }
        clean[def.key] = num;
        break;
      }
      case 'select':
        if (typeof value !== 'string' || !(def.options || []).includes(value)) {
          return {
            ok: false,
            error: `"${def.label}" must be one of: ${(def.options || []).join(', ')}.`,
          };
        }
        clean[def.key] = value;
        break;
      case 'multi-select': {
        if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
          return { ok: false, error: `"${def.label}" must be a list of values.` };
        }
        const opts = def.options || [];
        for (const v of value) {
          if (!opts.includes(v)) {
            return { ok: false, error: `"${def.label}" contains an invalid option: ${v}.` };
          }
        }
        clean[def.key] = value;
        break;
      }
      case 'boolean':
        if (typeof value !== 'boolean') {
          return { ok: false, error: `"${def.label}" must be true or false.` };
        }
        clean[def.key] = value;
        break;
      default:
        return { ok: false, error: `Unknown attribute type for "${def.label}".` };
    }
  }

  return { ok: true, clean };
}

/**
 * Server-side product save. Verifies the session server-side, validates
 * products.attributes against the leaf category's attribute_schema, then writes
 * via the server client (RLS still enforces admin-only writes).
 */
export async function saveProduct(input: SaveProductInput): Promise<SaveProductResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated.' };
    }

    let schema: CategoryAttributeDefinition[] = [];
    if (input.category_id) {
      // Resolve the effective schema: the leaf (subcategory) schema merged with
      // its top-level parent's common schema.
      const { data: cat } = await supabase
        .from('categories')
        .select('id,parent_id,attribute_schema')
        .eq('id', input.category_id)
        .maybeSingle();
      if (cat) {
        let parentSchema: CategoryAttributeDefinition[] | null = null;
        if (cat.parent_id) {
          const { data: parent } = await supabase
            .from('categories')
            .select('attribute_schema')
            .eq('id', cat.parent_id)
            .maybeSingle();
          parentSchema = Array.isArray(parent?.attribute_schema) ? parent.attribute_schema : null;
        }
        const leafSchema = Array.isArray(cat.attribute_schema) ? cat.attribute_schema : null;
        schema = mergeAttributeSchemas(parentSchema, leafSchema);
      }
    }

    const validated = validateAttributes(input.attributes, schema);
    if (!validated.ok) {
      return { success: false, error: validated.error };
    }

    const mrp = Number(input.original_price) || 0;
    const salePrice = Number(input.price) || 0;

    // Reject selling price exceeding MRP (only when MRP is explicitly set).
    if (input.original_price !== undefined && input.original_price !== null && mrp > 0 && salePrice > mrp) {
      return { success: false, error: 'Selling price cannot be greater than the original price (MRP).' };
    }

    const primary = input.gallery && input.gallery[0];
    const payload = {
      name: input.name,
      title: input.name,
      price: salePrice,
      original_price: input.original_price ?? salePrice,
      badge: computeBadge(mrp, salePrice, input.badge),
      category_id: input.category_id,
      attributes: validated.clean ?? {},
      stock_quantity: input.stock_quantity,
      description: input.description || '',
      image_url: primary?.large || input.image_large || input.image_url || '/images/placeholder.jpg',
      image_large: primary?.large || input.image_large || '/images/placeholder.jpg',
      image_medium: primary?.medium || input.image_medium || '/images/placeholder.jpg',
      image_thumbnail: primary?.thumbnail || input.image_thumbnail || '/images/placeholder.jpg',
    };

    const syncGallery = async (productId: string) => {
      const gallery = input.gallery?.slice(0, 4) ?? [];
      const { error: delErr } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);
      if (delErr) return delErr;
      if (gallery.length === 0) return null;
      const rows = gallery.map((img, position) => ({
        product_id: productId,
        position,
        original_url: img.original || null,
        large_url: img.large || null,
        medium_url: img.medium || null,
        thumbnail_url: img.thumbnail || null,
      }));
      const { error: insErr } = await supabase.from('product_images').insert(rows);
      return insErr ?? null;
    };

    if (input.id) {
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', input.id)
        .select('id')
        .maybeSingle();
      if (error) return { success: false, error: error.message };
      const galleryErr = data ? await syncGallery(String(data.id)) : null;
      if (galleryErr) return { success: false, error: galleryErr.message };
      return { success: true, productId: data?.id };
    }

    // Create: legacy free-text category is populated once; existing rows are
    // never touched (updates above never include the `category` column).
    const insertPayload = {
      ...payload,
      ...(input.legacyCategoryName ? { category: input.legacyCategoryName } : {}),
      rating: 4.0,
      sold: 0,
    };
    const { data, error } = await supabase
      .from('products')
      .insert(insertPayload)
      .select('id')
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    if (data) {
      const galleryErr = await syncGallery(String(data.id));
      if (galleryErr) return { success: false, error: galleryErr.message };
    }
    return { success: true, productId: data?.id };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to save product.' };
  }
}
