import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Supabase Storage helpers for generated Reel files.
 * Bucket `social-reels` is PRIVATE — files are only reachable via server-side
 * signed URLs (admin preview now, Instagram publish later).
 */

export const REEL_BUCKET = 'social-reels';

export function reelStoragePath(
  productId: string,
  reelId: string,
  version: number,
  kind: 'video' | 'thumbnail'
): string {
  return `${productId}/${reelId}/v${version}.${kind === 'video' ? 'mp4' : 'jpg'}`;
}

export interface UploadedReelFiles {
  videoPath: string;
  thumbnailPath: string;
}

export async function uploadReelFiles(
  productId: string,
  reelId: string,
  version: number,
  mp4: Buffer,
  thumbnail: Buffer
): Promise<UploadedReelFiles> {
  const admin = createAdminClient();
  const videoPath = reelStoragePath(productId, reelId, version, 'video');
  const thumbnailPath = reelStoragePath(productId, reelId, version, 'thumbnail');
  const [v, t] = await Promise.all([
    admin.storage.from(REEL_BUCKET).upload(videoPath, mp4, { contentType: 'video/mp4', upsert: true }),
    admin.storage.from(REEL_BUCKET).upload(thumbnailPath, thumbnail, { contentType: 'image/jpeg', upsert: true }),
  ]);
  if (v.error || t.error) {
    throw new Error('Failed to upload reel files to storage.');
  }
  return { videoPath, thumbnailPath };
}

export async function signedUrlForPath(
  path: string | null | undefined,
  expirySeconds = 3600
): Promise<string | null> {
  if (!path) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(REEL_BUCKET).createSignedUrl(path, expirySeconds);
    return error ? null : (data?.signedUrl ?? null);
  } catch {
    return null;
  }
}

export async function deleteReelFiles(productId: string, reelId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const folder = `${productId}/${reelId}`;
    const { data: list } = await admin.storage.from(REEL_BUCKET).list(folder);
    if (list && list.length > 0) {
      const paths = list.map((f) => `${folder}/${f.name}`);
      await admin.storage.from(REEL_BUCKET).remove(paths);
    }
  } catch (e) {
    console.error('[reel] deleteReelFiles error:', e);
  }
}
