import { getProductById, getSimilarProducts, toProductCard } from '@/lib/products';
import { getCategoryById, mergeAttributeSchemas } from '@/lib/categories';
import { getProductReviewSummary, getReviewSummaries } from '@/lib/reviews';
import { parseSizes } from '@/lib/sizes';
import { calculateDiscount, formatPrice } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Star } from 'lucide-react';
import ProductActions from '@/components/product/ProductActions';
import ProductImageGallery, { type ProductGalleryImage } from '@/components/product/ProductImageGallery';
import ProductReviewsSection from '@/components/reviews/ProductReviewsSection';
import ProductCard from '@/components/product/ProductCard';
import type { Category } from '@/types';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800';

function Stars({ value, size = 'w-4 h-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </span>
  );
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;
  const rawProduct = await getProductById(id);

  if (!rawProduct) {
    notFound();
  }

  const productTitle = String(rawProduct.title || rawProduct.name || 'Janya Product');

  // --- Gallery (product_images up to 4, with legacy fallback) ---
  const galleryImages: ProductGalleryImage[] =
    rawProduct.gallery?.map((g, i) => ({
      key: `${rawProduct.id}-gallery-${i}`,
      large: g.large || undefined,
      medium: g.medium || undefined,
      thumbnail: g.thumbnail || undefined,
      alt: `${productTitle} image ${i + 1}`,
    })) ?? [];

  if (galleryImages.length === 0) {
    galleryImages.push({
      key: `${rawProduct.id}-legacy`,
      large: rawProduct.image_large || rawProduct.image_url || undefined,
      medium: rawProduct.image_medium || undefined,
      thumbnail: rawProduct.image_thumbnail || undefined,
      alt: productTitle,
    });
  }

  const primaryImage = galleryImages[0]?.large || galleryImages[0]?.medium || FALLBACK_IMAGE;

  // --- Normalized product for client actions ---
  const product = {
    id: String(rawProduct.id),
    title: productTitle,
    price: Number(rawProduct.price) || 0,
    discount_price: Number(rawProduct.discount_price || rawProduct.price) || 0,
    material: rawProduct.material || rawProduct.category || '',
    plating: rawProduct.plating || rawProduct.badge || '',
    images: [primaryImage],
    sizes: parseSizes(rawProduct.attributes),
    stock_quantity: rawProduct.stock_quantity ?? 0,
    in_stock: rawProduct.in_stock ?? ((rawProduct.stock_quantity ?? 0) > 0),
    is_featured: rawProduct.is_featured ?? true,
    is_new_arrival: rawProduct.is_new_arrival ?? true,
    slug: rawProduct.slug || '',
  };

  // --- Category breadcrumb + attribute display ---
  let categoryLink: { name: string; href: string } | null = null;
  let parentCategoryLink: { name: string; href: string } | null = null;
  let productCategory = null as (Category & { parent?: Category | null }) | null;
  if (rawProduct.category_id) {
    const cat = await getCategoryById(String(rawProduct.category_id));
    if (cat) {
      const parent = cat.parent_id ? await getCategoryById(String(cat.parent_id)) : null;
      productCategory = { ...cat, parent };
      categoryLink = {
        name: cat.name,
        href: parent
          ? `/category/${parent.slug}/${cat.slug}`
          : `/category/${cat.slug}`,
      };
      if (parent) {
        parentCategoryLink = { name: parent.name, href: `/category/${parent.slug}` };
      }
    }
  }

  // Friendly attribute rows driven by the category's attribute_schema.
  const attributeRows = (() => {
    const schema = mergeAttributeSchemas(
      productCategory?.parent?.attribute_schema ?? null,
      productCategory?.attribute_schema ?? null
    );
    const attrs = (rawProduct.attributes ?? {}) as Record<string, unknown>;
    const rows: { label: string; value: string }[] = [];
    for (const def of schema) {
      const val = attrs[def.key];
      if (val === undefined || val === null || val === '') continue;
      let display: string;
      if (def.type === 'multi-select' && Array.isArray(val)) {
        display = val.join(', ');
      } else {
        display = String(val);
      }
      if (def.suffix && display) display = `${display} ${def.suffix}`;
      rows.push({ label: def.label, value: display });
    }
    return rows;
  })();

  // --- Real rating summary (approved reviews only) ---
  const reviewSummary = await getProductReviewSummary(String(rawProduct.id));

  // --- Discount (same formula as the backend authority) ---
  const mrp = Number(rawProduct.original_price) || 0;
  const sellingPrice = Number(rawProduct.price) || 0;
  const discountPct = calculateDiscount(mrp, sellingPrice);
  const badge = rawProduct.badge?.trim() || null;

  // --- Similar products (projected query, reuses ProductCard) ---
  const similarProducts = await getSimilarProducts(
    { id: String(rawProduct.id), category_id: rawProduct.category_id },
    8
  );
  const similarReviewMap = await getReviewSummaries(similarProducts.map((p: any) => String(p.id)));

  // Breadcrumb segments.
  const crumbs: { label: string; href?: string }[] = [{ label: 'Home', href: '/' }];
  if (parentCategoryLink) crumbs.push({ label: parentCategoryLink.name, href: parentCategoryLink.href });
  if (categoryLink) crumbs.push({ label: categoryLink.name, href: categoryLink.href });
  crumbs.push({ label: productTitle });

  const shortDescription =
    (rawProduct.description || '').length > 120
      ? `${(rawProduct.description || '').slice(0, 120).trim()}…`
      : rawProduct.description || '';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-6 flex-wrap" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
            {c.href ? (
              <Link href={c.href} className="hover:text-rose-600 transition-colors whitespace-nowrap">
                {c.label}
              </Link>
            ) : (
              <span className="text-gray-700 font-medium truncate max-w-[160px] sm:max-w-[280px]">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
        {/* Left: gallery */}
        <div className="w-full">
          <ProductImageGallery images={galleryImages} alt={productTitle} />
        </div>

        {/* Right: product info */}
        <div className="flex flex-col">
          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 leading-snug">
            {productTitle}
          </h1>

          {/* Rating / review summary — real data only */}
          {reviewSummary.count > 0 && reviewSummary.average !== null && (
            <a
              href="#reviews"
              className="inline-flex items-center gap-2 mt-3 group"
              aria-label={`Rated ${reviewSummary.average.toFixed(1)} out of 5, ${reviewSummary.count} reviews`}
            >
              <Stars value={reviewSummary.average} />
              <span className="text-sm font-semibold text-gray-900">{reviewSummary.average.toFixed(1)}</span>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500 group-hover:text-rose-600 transition-colors">
                {reviewSummary.count} Review{reviewSummary.count !== 1 ? 's' : ''}
              </span>
            </a>
          )}

          {/* Subtitle / short description */}
          {shortDescription && (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed line-clamp-2">{shortDescription}</p>
          )}

          {/* Price block */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="flex items-end flex-wrap gap-x-3 gap-y-1">
              <span className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none">
                {formatPrice(sellingPrice)}
              </span>
              {mrp > sellingPrice && (
                <>
                  <span className="text-base text-gray-400 line-through">{formatPrice(mrp)}</span>
                  <span className="text-sm font-bold text-emerald-600">{discountPct}% OFF</span>
                </>
              )}
              {badge && discountPct === 0 && (
                <span className="inline-flex items-center bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-2">Inclusive of all taxes</p>
          </div>

          {/* Attributes (real product attributes only) */}
          {attributeRows.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Product Details
              </h2>
              <div className="border border-gray-100 rounded-lg overflow-hidden">
                {attributeRows.map((row, i) => (
                  <div
                    key={row.label}
                    className={`flex items-start justify-between gap-4 px-4 py-2.5 text-sm ${
                      i % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    }`}
                  >
                    <span className="text-gray-500">{row.label}</span>
                    <span className="text-gray-900 font-medium text-right">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Purchase section (size selector, stock, qty, add to cart, wishlist) */}
          <div className="mt-6">
            <ProductActions product={product} />
          </div>

          {/* Description */}
          {rawProduct.description && (
            <div className="mt-8">
              <h2 className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2">
                Description
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">{rawProduct.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer reviews + ratings (real data) */}
      <section id="reviews" className="scroll-mt-24">
        <ProductReviewsSection productId={String(product.id)} />
      </section>

      {/* Similar products */}
      {similarProducts.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-serif font-bold text-gray-900 mb-6">Similar Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {similarProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={toProductCard(p)}
                rating={similarReviewMap[String(p.id)]}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
