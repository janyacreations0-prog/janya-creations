import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { SITE_URL, absoluteUrl } from '@/lib/seo';

/** Static public pages that should appear in the sitemap. */
const STATIC_PAGES: { path: string; priority: number }[] = [
  { path: '/', priority: 1.0 },
  { path: '/shop', priority: 0.9 },
  { path: '/about', priority: 0.4 },
  { path: '/contact', priority: 0.4 },
  { path: '/shipping-policy', priority: 0.2 },
  { path: '/refund-policy', priority: 0.2 },
  { path: '/cancellation-policy', priority: 0.2 },
  { path: '/terms', priority: 0.2 },
  { path: '/privacy-policy', priority: 0.2 },
  { path: '/payment-information', priority: 0.2 },
  { path: '/cookie-policy', priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: absoluteUrl(p.path),
    priority: p.priority,
    changeFrequency: p.path === '/' ? 'daily' : 'weekly',
  }));

  // ── Categories ──────────────────────────────────────────────────────────
  const { data: allCategories } = await supabase
    .from('categories')
    .select('id, slug, parent_id, updated_at, created_at')
    .eq('is_active', true);

  if (allCategories) {
    const catMap = new Map(
      allCategories.map((c: any) => [String(c.id), c])
    );

    for (const cat of allCategories as any[]) {
      const id = String(cat.id);
      const parentId = cat.parent_id ? String(cat.parent_id) : null;
      const lastMod = cat.updated_at || cat.created_at || undefined;

      if (parentId) {
        // Subcategory — canonical URL uses parent slug.
        const parent = catMap.get(parentId);
        if (parent) {
          entries.push({
            url: absoluteUrl(`/category/${parent.slug}/${cat.slug}`),
            lastModified: lastMod ? new Date(lastMod) : undefined,
            priority: 0.6,
            changeFrequency: 'weekly',
          });
        }
      } else {
        entries.push({
          url: absoluteUrl(`/category/${cat.slug}`),
          lastModified: lastMod ? new Date(lastMod) : undefined,
          priority: 0.7,
          changeFrequency: 'weekly',
        });
      }
    }
  }

  // ── Products ────────────────────────────────────────────────────────────
  const { data: products } = await supabase
    .from('products')
    .select('id, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);

  if (products) {
    for (const p of products as any[]) {
      entries.push({
        url: absoluteUrl(`/products/${p.id}`),
        lastModified: p.created_at ? new Date(p.created_at) : undefined,
        priority: 0.5,
        changeFrequency: 'weekly',
      });
    }
  }

  return entries;
}