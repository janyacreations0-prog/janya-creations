import { getProducts } from '@/lib/products';
import { getCategoryById, mergeAttributeSchemas } from '@/lib/categories';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductActions from '@/components/product/ProductActions';
import ProductReviewsSection from '@/components/reviews/ProductReviewsSection';
import BackButton from '@/components/ui/BackButton';
import { Home } from 'lucide-react';
import type { Category } from '@/types';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { id } = await params;
  const allProducts = await getProducts();

  // Match by id (convert both to string for comparison)
  const rawProduct = allProducts.find((p: any) => String(p.id) === String(id));

  if (!rawProduct) {
    notFound();
  }

  // Fallback image handling
  const fallbackImage =
    'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800';

  // Get image from images array (if exists) or use fallback
  let imageUrl = fallbackImage;
  if (rawProduct.images && Array.isArray(rawProduct.images) && rawProduct.images.length > 0) {
    imageUrl = rawProduct.images[0];
  } else if (rawProduct.image_url) {
    imageUrl = rawProduct.image_url;
  } else if (rawProduct.image_large) {
    imageUrl = rawProduct.image_large;
  } else if (rawProduct.image_medium) {
    imageUrl = rawProduct.image_medium;
  }

  // Normalize product structure for client actions
  const product = {
    id: String(rawProduct.id),
    title: String(rawProduct.title || rawProduct.name || 'Janya Product'),
    price: Number(rawProduct.price) || 0,
    discount_price: Number(rawProduct.discount_price || rawProduct.price) || 0,
    material: rawProduct.material || rawProduct.category || '',
    plating: rawProduct.plating || rawProduct.badge || '',
    images: [imageUrl],
    stock_quantity: rawProduct.stock_quantity ?? 0,
    in_stock: rawProduct.in_stock ?? ((rawProduct.stock_quantity ?? 0) > 0),
    is_featured: rawProduct.is_featured ?? true,
    is_new_arrival: rawProduct.is_new_arrival ?? true,
    slug: rawProduct.slug || '',
  };

  // Category breadcrumb + attribute display (if the product has a category_id)
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

  // Friendly attribute rows driven by the category's attribute_schema
  // (top-level common schema inherited and merged with the subcategory schema).
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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Navigation Bar (Back & Home Buttons) */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
        <BackButton />

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-rose-600 transition-colors bg-gray-50 hover:bg-rose-50 px-3.5 py-1.5 rounded-full border border-gray-200"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div className="aspect-square relative w-full bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
          <Image
            src={imageUrl}
            alt={product.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>

        <div className="flex flex-col space-y-6">
          <div>
            {/* Category breadcrumb */}
            <nav className="text-xs text-gray-500 flex items-center gap-1 flex-wrap mb-2">
              {parentCategoryLink && (
                <>
                  <Link href={parentCategoryLink.href} className="hover:text-rose-600">
                    {parentCategoryLink.name}
                  </Link>
                  <span>/</span>
                </>
              )}
              {categoryLink ? (
                <Link href={categoryLink.href} className="hover:text-rose-600 font-medium text-gray-700">
                  {categoryLink.name}
                </Link>
              ) : (
                <span className="text-gray-400 uppercase tracking-widest">
                  {rawProduct.category || rawProduct.material || 'Jewellery'}
                </span>
              )}
            </nav>
            <h1 className="text-3xl font-serif font-bold text-gray-900 mt-2">
              {product.title}
            </h1>
            <p className="text-2xl font-bold text-gray-900 mt-4">₹{product.price}</p>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">
              Description
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              {rawProduct.description ||
                'Exquisite handcrafted piece crafted with precision and premium quality materials. Perfect for special occasions and everyday elegance.'}
            </p>
          </div>

          {attributeRows.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
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

          {/* Interactive Actions (Client Component) */}
          <ProductActions product={product} />
        </div>
      </div>

      {/* Customer reviews + ratings */}
      <ProductReviewsSection productId={String(product.id)} />
    </main>
  );
}