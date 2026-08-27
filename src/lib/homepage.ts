import { supabase } from './supabase';
import { getCategoryTree } from './categories';

export interface HeroSlideProduct {
  id: string;
  title: string;
  image_large: string | null;
  image_medium: string | null;
  image_thumbnail: string | null;
  price: number;
  badge: string | null;
}

export interface HeroSlide {
  /** Small collection label shown above the headline. */
  label: string;
  /** Large serif headline. */
  heading: string;
  /** Short supporting text (1-2 lines). */
  description: string;
  /** CTA button text. */
  cta: string;
  /** Destination link for the SHOP NOW button. */
  link: string;
  /** Up to 5 product images displayed on the slide. */
  products: HeroSlideProduct[];
}

const PROJECTION = 'id, title, image_large, image_medium, image_thumbnail, price, badge';

/**
 * Server-side data selection for the homepage hero carousel.
 * Queries are projected (no SELECT *) and capped at low limits.
 * Returns an array of slides; each slide holds 1–5 real products.
 * When no data matches a query, the slide is skipped automatically.
 */
export async function getHeroSlides(): Promise<HeroSlide[]> {
  const slides: HeroSlide[] = [];

  // ── Gold Plated Collection ──────────────────────────────────────────────
  const { data: gold } = await supabase
    .from('products')
    .select(PROJECTION)
    .contains('attributes', { material: 'Gold Plated' })
    .order('created_at', { ascending: false })
    .limit(5);
  if (gold && gold.length > 0) {
    slides.push({
      label: 'Gold Plated Collection',
      heading: 'Timeless Elegance in Gold',
      description:
        'Discover our curated selection of gold-plated jewellery, crafted to add a touch of luxury to every occasion.',
      cta: 'SHOP NOW',
      link: '/shop?category=artificial-jewellery&material=Gold+Plated',
      products: gold,
    });
  }

  // ── New Arrivals ────────────────────────────────────────────────────────
  const { data: newP } = await supabase
    .from('products')
    .select(PROJECTION)
    .order('created_at', { ascending: false })
    .limit(5);
  if (newP && newP.length > 0) {
    slides.push({
      label: 'New Arrivals',
      heading: 'Fresh Designs for Your Collection',
      description:
        'Explore our latest arrivals, handpicked for the modern woman.',
      cta: 'SHOP NEW ARRIVALS',
      link: '/shop?filter=new-arrivals',
      products: newP,
    });
  }

  // ── Anti-Tarnish ────────────────────────────────────────────────────────
  const { data: anti } = await supabase
    .from('products')
    .select(PROJECTION)
    .ilike('title', '%Anti Tarnish%')
    .limit(5);
  if (anti && anti.length > 0) {
    slides.push({
      label: 'Anti-Tarnish',
      heading: 'Stay Beautiful, Stay Brilliant',
      description:
        'Our anti-tarnish collection ensures your jewellery shines as bright as you do, every single day.',
      cta: 'SHOP ANTI-TARNISH',
      link: '/shop?q=Anti+Tarnish',
      products: anti,
    });
  }

  // ── Featured Collection (replaces "Best Selling" — no real sales data) ──
  const { data: featured } = await supabase
    .from('products')
    .select(PROJECTION)
    .order('created_at', { ascending: false })
    .limit(4);
  if (featured && featured.length > 0) {
    slides.push({
      label: 'Featured Collection',
      heading: 'Curated Just for You',
      description:
        'From everyday elegance to festive glamour, find your perfect match in our handpicked selection.',
      cta: 'SHOP ALL',
      link: '/shop',
      products: featured,
    });
  }

  return slides;
}

// ── Category Cards ─────────────────────────────────────────────────────────

export interface CategoryCard {
  id: string;
  name: string;
  slug: string;
  /** Representative image URL (category.image_url or a real product from that category). */
  image: string | null;
  /** Short marketing descriptor for the card. */
  descriptor: string;
}

const CATEGORY_DESCRIPTORS: Record<string, string> = {
  'Artificial Jewellery': 'Elegant pieces for every occasion',
  "Women's Clothing": 'Traditional and contemporary styles',
  Accessories: 'Complete your look',
  Toys: 'Fun picks for little ones',
};

/**
 * Builds category cards for the homepage Shop by Category section.
 * Uses the real category image_url when available, otherwise falls back to a
 * real product image belonging to that category. For categories with zero
 * products the card renders without an image (premium branded tile).
 */
export async function getCategoryCards(): Promise<CategoryCard[]> {
  const tree = await getCategoryTree();
  const top = tree.filter((c) => c.is_active);

  // Collect representative product images for each top category (one query).
  const topIds = top.map((c) => String(c.id));
  const sampleByCategory = new Map<string, string>();

  // Direct products in the top-level category itself.
  if (topIds.length > 0) {
    const { data } = await supabase
      .from('products')
      .select('category_id, image_medium')
      .in('category_id', topIds)
      .order('created_at', { ascending: false });
    (data || []).forEach((p: any) => {
      const key = String(p.category_id);
      if (p.image_medium && !sampleByCategory.has(key)) sampleByCategory.set(key, p.image_medium);
    });
  }

  // Products in subcategories — map them up to the parent.
  const subCatIds = top.flatMap((c) => (c.children || []).map((ch) => String(ch.id)));
  if (subCatIds.length > 0) {
    const parentOf = new Map<string, string>();
    top.forEach((c) => (c.children || []).forEach((ch) => parentOf.set(String(ch.id), String(c.id))));

    const { data } = await supabase
      .from('products')
      .select('category_id, image_medium')
      .in('category_id', subCatIds)
      .order('created_at', { ascending: false });
    (data || []).forEach((p: any) => {
      const subKey = String(p.category_id);
      const parentId = parentOf.get(subKey);
      if (p.image_medium && parentId && !sampleByCategory.has(parentId)) {
        sampleByCategory.set(parentId, p.image_medium);
      }
    });
  }

  return top.map((c) => ({
    id: String(c.id),
    name: c.name,
    slug: c.slug,
    image: c.image_url || sampleByCategory.get(String(c.id)) || null,
    descriptor: CATEGORY_DESCRIPTORS[c.name] || 'Shop the collection',
  }));
}