'use server';

import { createClient } from '@/lib/supabase/server';
import { getProductById } from '@/lib/products';
import { getCategoryById } from '@/lib/categories';
import { isAdminUser } from '@/lib/admin';
import {
  REEL_TEMPLATES,
  generateReelCaption,
  trackingUrlFor,
  type ReelTemplate,
} from '@/lib/reel-templates';
import { renderReel } from '@/lib/reel-generator';
import { uploadReelFiles, signedUrlForPath, deleteReelFiles } from '@/lib/reel-storage';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ReelJob {
  id: string;
  reel_id: string;
  product_id: string;
  product_title?: string;
  template: string;
  creative_version: number;
  status: string;
  video_url: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  destination_url: string | null;
  tracking_url: string | null;
  scheduled_at: string | null;
  generated_at: string | null;
  approved_at: string | null;
  error_message: string | null;
  attempt_count: number;
  created_at: string;
  /** Signed URLs for admin preview (populated at read time). */
  signedVideoUrl?: string | null;
  signedThumbnailUrl?: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchProductData(productId: string) {
  const product = await getProductById(productId);
  if (!product) return null;
  const gallery = product.gallery ?? [];
  const imageUrls = gallery
    .map((g: any) => g.large || g.medium || '')
    .filter(Boolean);
  if (imageUrls.length === 0) {
    const img = product.image_large || product.image_url || '';
    if (img) imageUrls.push(img);
  }
  let categoryName: string | null = null;
  let categorySlug: string | null = null;
  let categoryParentSlug: string | null = null;
  if (product.category_id) {
    const cat = await getCategoryById(String(product.category_id));
    categoryName = cat?.name ?? null;
    categorySlug = cat?.slug ?? null;
    if (cat?.parent_id) {
      const parent = await getCategoryById(String(cat.parent_id));
      categoryParentSlug = parent?.slug ?? null;
    }
  }
  return {
    id: String(product.id),
    title: String(product.title || product.name || ''),
    price: Number(product.price) || 0,
    original_price: product.original_price ? Number(product.original_price) : null,
    categoryName,
    categorySlug,
    categoryParentSlug,
    imageUrls,
  };
}

/** Maps a DB row to a ReelJob with signed URLs. */
async function rowToJob(row: any): Promise<ReelJob> {
  const [video, thumb] = await Promise.all([
    signedUrlForPath(row.video_url, 7200),
    signedUrlForPath(row.thumbnail_url, 7200),
  ]);
  // Fetch product title for display.
  let productTitle: string | undefined;
  try {
    const sup = await createClient();
    const { data } = await sup.from('products').select('title').eq('id', row.product_id).maybeSingle();
    productTitle = data?.title ?? undefined;
  } catch { /* ignore */ }
  return {
    id: row.id,
    reel_id: row.reel_id,
    product_id: row.product_id,
    product_title: productTitle,
    template: row.template,
    creative_version: row.creative_version,
    status: row.status,
    video_url: row.video_url,
    thumbnail_url: row.thumbnail_url,
    caption: row.caption,
    destination_url: row.destination_url,
    tracking_url: row.tracking_url,
    scheduled_at: row.scheduled_at,
    generated_at: row.generated_at,
    approved_at: row.approved_at,
    error_message: row.error_message,
    attempt_count: row.attempt_count,
    created_at: row.created_at,
    signedVideoUrl: video,
    signedThumbnailUrl: thumb,
  };
}

// ── Server Actions ────────────────────────────────────────────────────────────

/** Lightweight product list for the Reel Factory selector. Never throws. */
export async function listProductsForReels(): Promise<{ id: string; title: string }[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('products').select('id, title, name').order('created_at', { ascending: false }).limit(200);
    return (data ?? []).map((p: any) => ({ id: String(p.id), title: p.title || p.name || 'Untitled' }));
  } catch (e: any) {
    console.error('[reel] listProductsForReels error:', e);
    return [];
  }
}

export async function listReelJobs(
  filters?: { status?: string; template?: string }
): Promise<ReelJob[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) return [];

    // The admin client requires SUPABASE_SERVICE_ROLE_KEY. If it is unset or
    // invalid, degrade gracefully (return empty list + log) instead of throwing
    // and breaking the whole Reel Factory page load.
    let admin;
    try {
      admin = createAdminClient();
    } catch (e: any) {
      console.error('[reel] listReelJobs admin client unavailable:', e?.message || e);
      return [];
    }

    let query = admin.from('social_reel_jobs').select('*').order('created_at', { ascending: false });
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.template) query = query.eq('template', filters.template);
    const { data, error } = await query;
    if (error) {
      console.error('[reel] listReelJobs query error:', error.message);
      return [];
    }
    if (!data) return [];
    return Promise.all(data.map(rowToJob));
  } catch (e: any) {
    console.error('[reel] listReelJobs error:', e);
    return [];
  }
}

export async function createReelJob(
  productId: string,
  template: ReelTemplate
): Promise<{ success: boolean; error?: string; job?: ReelJob }> {
  try {
    // Check admin.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) {
      return { success: false, error: 'Admin access required.' };
    }

    // Fetch product data.
    const product = await fetchProductData(productId);
    if (!product) return { success: false, error: 'Product not found.' };

    // Safe diagnostic — reports PRESENCE ONLY (never the value/characters).
    console.log('[reel] createReelJob SUPABASE_SERVICE_ROLE_KEY_PRESENT=' +
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY));

    // Check for existing job.
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('social_reel_jobs')
      .select('id, reel_id, status, creative_version, attempt_count')
      .eq('product_id', productId)
      .eq('template', template)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'draft' || existing.status === 'generating') {
        // Return existing job — don't duplicate.
        const job = await rowToJob(existing);
        return { success: true, job };
      }
      if (existing.status === 'ready' || existing.status === 'approved') {
        return { success: false, error: 'A Reel for this product and template already exists. Use Regenerate to create a new creative version.' };
      }
      // Failed — retry (reuse existing row).
    }

    const isNew = !existing;
    const reelId = isNew
      ? (await admin.rpc('next_social_reel_id')).data ?? `reel_${Date.now()}`
      : existing.reel_id;
    const version = isNew ? 1 : (existing.creative_version + 1);

    // Build caption + tracking URL.
    const reelProduct = {
      id: product.id,
      title: product.title,
      price: product.price,
      original_price: product.original_price,
      categoryName: product.categoryName,
      categorySlug: product.categorySlug,
      categoryParentSlug: product.categoryParentSlug,
    };
    const captionData = generateReelCaption(reelProduct, template, reelId, version);
    const dest = template === 'collection'
      ? (product.categorySlug ? `${'https://janyacreations.com'}/category/${product.categorySlug}` : `${'https://janyacreations.com'}/shop`)
      : `${'https://janyacreations.com'}/products/${product.id}`;
    const tracking = trackingUrlFor(reelProduct, template, reelId);

    // Determine the price/display values for the render.
    const priceText = `₹${product.price.toLocaleString('en-IN')}`;
    const discountText = product.original_price && product.price < product.original_price
      ? `${Math.round(((product.original_price - product.price) / product.original_price) * 100)}% OFF`
      : undefined;

    // Set status to generating.
    let jobId: string | null = null;
    if (isNew) {
      const { data: newJob, error: insertErr } = await admin
        .from('social_reel_jobs')
        .insert({
          reel_id: reelId,
          product_id: product.id,
          template,
          creative_version: version,
          status: 'generating',
          caption: captionData.caption,
          destination_url: dest,
          tracking_url: tracking,
          created_by: user.id,
          attempt_count: 1,
        })
        .select('id')
        .single();
      if (insertErr || !newJob) return { success: false, error: 'Failed to create Reel job.' };
      jobId = newJob.id;
    } else {
      jobId = existing.id;
      const { error: updErr } = await admin
        .from('social_reel_jobs')
        .update({
          status: 'generating',
          creative_version: version,
          caption: captionData.caption,
          destination_url: dest,
          tracking_url: tracking,
          attempt_count: existing.attempt_count + 1,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (updErr) return { success: false, error: 'Failed to update Reel job.' };
    }

    // Generate the Reel.
    const { mp4, thumbnail } = await renderReel({
      title: product.title,
      priceText,
      discountText,
      hook: captionData.hook,
      cta: captionData.cta,
      destinationLabel: captionData.cta,
      images: product.imageUrls,
    });

    // Upload to storage.
    const { videoPath, thumbnailPath } = await uploadReelFiles(product.id, reelId, version, mp4, thumbnail);

    // Update job with paths.
    if (jobId) {
      await admin
        .from('social_reel_jobs')
        .update({
          status: 'ready',
          video_url: videoPath,
          thumbnail_url: thumbnailPath,
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', jobId);

      // Insert version history row.
      await admin.from('social_reel_versions').insert({
        reel_job_id: jobId,
        version,
        video_url: videoPath,
        thumbnail_url: thumbnailPath,
        caption: captionData.caption,
        status: 'ready',
      });
    }

    // Fetch and return the updated job.
    const { data: finalRow } = await admin.from('social_reel_jobs').select('*').eq('id', jobId).maybeSingle();
    return { success: true, job: finalRow ? await rowToJob(finalRow) : undefined };
  } catch (e: any) {
    console.error('[reel] createReelJob error:', e);
    return { success: false, error: e?.message || 'Failed to create Reel.' };
  }
}

export async function regenerateReelJob(
  jobId: string
): Promise<{ success: boolean; error?: string; job?: ReelJob }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) return { success: false, error: 'Admin access required.' };

    const admin = createAdminClient();
    const { data: job } = await admin.from('social_reel_jobs').select('*').eq('id', jobId).maybeSingle();
    if (!job) return { success: false, error: 'Reel job not found.' };

    // Re-run with the same input but increment version.
    return createReelJob(job.product_id, job.template);
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to regenerate.' };
  }
}

export async function approveReelJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) return { success: false, error: 'Admin access required.' };

    const admin = createAdminClient();
    const { error } = await admin
      .from('social_reel_jobs')
      .update({ status: 'approved', approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', jobId);
    return error ? { success: false, error: error.message } : { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to approve.' };
  }
}

export async function updateReelCaption(
  jobId: string,
  caption: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) return { success: false, error: 'Admin access required.' };

    const admin = createAdminClient();
    const { error } = await admin
      .from('social_reel_jobs')
      .update({ caption, updated_at: new Date().toISOString() })
      .eq('id', jobId);
    return error ? { success: false, error: error.message } : { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to update caption.' };
  }
}

export async function deleteReelJob(jobId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isAdminUser(user))) return { success: false, error: 'Admin access required.' };

    const admin = createAdminClient();
    const { data: job } = await admin.from('social_reel_jobs').select('product_id, reel_id').eq('id', jobId).maybeSingle();
    if (!job) return { success: false, error: 'Reel job not found.' };

    await deleteReelFiles(job.product_id, job.reel_id);
    const { error } = await admin.from('social_reel_jobs').delete().eq('id', jobId);
    return error ? { success: false, error: error.message } : { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to delete.' };
  }
}