import Image from 'next/image';
import Link from 'next/link';
import ProductCard from '@/components/product/ProductCard';
import { toProductCard } from '@/lib/products';
import type { Category } from '@/types';

/**
 * Top-level category page: header + subcategory chips + all products in the
 * category (including its subcategories).
 */
export function TopLevelCategoryView({
  category,
  subcategories,
  products,
}: {
  category: Category;
  subcategories: Category[];
  products: any[];
}) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10">
        {category.image_url ? (
          <div className="relative w-full h-48 md:h-72 rounded-xl overflow-hidden mb-6">
            <Image
              src={category.image_url}
              alt={category.name}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        ) : null}
        <h1 className="text-3xl font-serif font-bold text-gray-900">{category.name}</h1>
        {category.description ? (
          <p className="text-gray-600 mt-3 max-w-2xl">{category.description}</p>
        ) : null}
      </div>

      {subcategories.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Shop by type</h2>
          <div className="flex flex-wrap gap-3">
            {subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/category/${category.slug}/${sub.slug}`}
                className="px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          All {category.name} Products
        </h2>
        {products.length === 0 ? (
          <p className="text-gray-500 py-12 text-center">No products in this category yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {products.map((p: any) => (
              <ProductCard key={p.id} product={toProductCard(p)} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/**
 * Subcategory page: breadcrumb + products in the subcategory only.
 */
export function SubcategoryCategoryView({
  category,
  parent,
  products,
}: {
  category: Category;
  parent: Category | null;
  products: any[];
}) {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:text-rose-600">Home</Link>
        <span>/</span>
        {parent && (
          <>
            <Link href={`/category/${parent.slug}`} className="hover:text-rose-600">
              {parent.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 font-medium">{category.name}</span>
      </nav>

      <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">{category.name}</h1>
      {category.description ? (
        <p className="text-gray-600 mb-8 max-w-2xl">{category.description}</p>
      ) : null}

      {products.length === 0 ? (
        <p className="text-gray-500 py-12 text-center">No products in this subcategory yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((p: any) => (
            <ProductCard key={p.id} product={toProductCard(p)} />
          ))}
        </div>
      )}
    </main>
  );
}
