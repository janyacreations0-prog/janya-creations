import { supabase } from '@/lib/supabase';
import { toProductCard } from '@/lib/products';
import {
  getCategoryTree,
  getCategoryBySlug,
  getCategoryById,
  getSubcategories,
  mergeAttributeSchemas,
} from '@/lib/categories';
import ProductCard from '@/components/product/ProductCard';
import ShopFilters, { type Facet } from '@/components/shop/ShopFilters';
import type { Category, CategoryAttributeDefinition } from '@/types';

interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

const SORT_ORDERS: Record<string, { column: string; ascending: boolean }> = {
  newest: { column: 'created_at', ascending: false },
  price_asc: { column: 'price', ascending: true },
  price_desc: { column: 'price', ascending: false },
  name_asc: { column: 'name', ascending: true },
  name_desc: { column: 'name', ascending: false },
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const category = first(sp.category);
  const subcategory = first(sp.subcategory);
  const minPrice = first(sp.min_price);
  const maxPrice = first(sp.max_price);
  const sort = first(sp.sort) || 'newest';
  const isNewArrivals = sp.filter === 'new-arrivals';

  // --- Resolve category / subcategory from slugs (active categories only) ---
  let activeCategory: Category | null = null;
  let activeSubcategory: Category | null = null;
  let categoryNotFound = false;
  let categoryIds: string[] = [];

  if (category) {
    const catBySlug = await getCategoryBySlug(category);
    if (!catBySlug) {
      categoryNotFound = true;
    } else if (catBySlug.parent_id) {
      // The category param is actually a subcategory slug.
      activeSubcategory = catBySlug;
      activeCategory = await getCategoryById(String(catBySlug.parent_id));
      categoryIds = [String(catBySlug.id)];
    } else {
      activeCategory = catBySlug;
      const subs = await getSubcategories(String(catBySlug.id));
      if (subcategory) {
        activeSubcategory = subs.find((s) => s.slug === subcategory) ?? null;
        if (activeSubcategory) categoryIds = [String(activeSubcategory.id)];
      } else {
        categoryIds = [String(catBySlug.id), ...subs.map((s) => String(s.id))];
      }
    }
  }

  // --- Build the server-side query (search / category / price / sort) ---
  let query = supabase.from('products').select('*');

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }
  if (category && !categoryNotFound) {
    // Applies the resolved leaf set; an empty set (e.g. invalid subcategory
    // under a valid category) correctly returns no products.
    query = query.in('category_id', categoryIds);
  }
  if (categoryNotFound) {
    query = query.in('category_id', ['00000000-0000-0000-0000-000000000000']);
  }

  const min = Number(minPrice);
  const max = Number(maxPrice);
  if (minPrice !== '' && !Number.isNaN(min) && min >= 0) {
    query = query.gte('price', min);
  }
  if (maxPrice !== '' && !Number.isNaN(max) && max >= 0) {
    query = query.lte('price', max);
  }

  const sortCfg = SORT_ORDERS[sort] ?? SORT_ORDERS.newest;
  query = query.order(sortCfg.column, { ascending: sortCfg.ascending });

  const { data: products, error } = await query;
  const all = (products as any[]) || [];
  if (error) {
    console.error('Error fetching products in shop:', error.message);
  }

  // --- Effective attribute schema for the active category (parent merged) ---
  let schema: CategoryAttributeDefinition[] = [];
  if (activeSubcategory) {
    schema = mergeAttributeSchemas(
      activeCategory?.attribute_schema ?? null,
      activeSubcategory.attribute_schema ?? null
    );
  } else if (activeCategory) {
    schema = activeCategory.attribute_schema ?? [];
  }

  // --- Apply attribute filters (JS over the category/search/price scoped set) ---
  const attrKeys = schema.map((d) => d.key);
  let filtered = all;
  for (const key of attrKeys) {
    const param = sp[key];
    if (!param) continue;
    const values = Array.isArray(param) ? param : [param];
    const def = schema.find((d) => d.key === key);
    if (!def) continue;

    filtered = filtered.filter((p) => {
      const val = (p.attributes ?? {})[key];
      if (def.type === 'boolean') {
        const wantTrue = values.includes('true');
        return val === true === wantTrue;
      }
      if (def.type === 'multi-select') {
        const arr = Array.isArray(val)
          ? val.map(String)
          : val !== undefined && val !== null
            ? [String(val)]
            : [];
        return values.some((v) => arr.some((a) => a.toLowerCase() === v.toLowerCase()));
      }
      if (typeof val !== 'string' && typeof val !== 'number') return false;
      return values.some((v) => String(val).toLowerCase() === v.toLowerCase());
    });
  }

  // --- Compute facets (select/multi-select/boolean) from the scoped set ---
  const facets: Facet[] = schema
    .filter((d) => d.type === 'select' || d.type === 'multi-select' || d.type === 'boolean')
    .map((d) => {
      if (d.type === 'boolean') {
        const hasTrue = all.some((p) => (p.attributes ?? {})[d.key] === true);
        return { def: d, values: hasTrue ? ['true'] : [] };
      }
      const set = new Set<string>();
      all.forEach((p) => {
        const val = (p.attributes ?? {})[d.key];
        if (d.type === 'multi-select' && Array.isArray(val)) {
          val.forEach((v) => set.add(String(v)));
        } else if (val !== undefined && val !== null && val !== '') {
          set.add(String(val));
        }
      });
      return { def: d, values: [...set] };
    })
    .filter((f) => f.values.length > 0);

  // --- Attribute params for the filter UI ---
  const attributeParams: Record<string, string[]> = {};
  attrKeys.forEach((key) => {
    const v = sp[key];
    if (!v) return;
    attributeParams[key] = Array.isArray(v) ? v : [v];
  });

  const tree = await getCategoryTree();
  const subcategoriesForUi = activeCategory
    ? (await getSubcategories(String(activeCategory.id))).map((s) => ({ slug: s.slug, name: s.name }))
    : [];

  let pageTitle = 'All Products';
  if (isNewArrivals) pageTitle = 'New Arrivals';
  else if (q) pageTitle = `Search results for "${q}"`;
  else if (categoryNotFound) pageTitle = 'Category Not Found';
  else if (activeSubcategory) pageTitle = activeSubcategory.name;
  else if (activeCategory) pageTitle = activeCategory.name;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 mb-6">{pageTitle}</h1>

      <div className="lg:grid lg:grid-cols-4 lg:gap-8">
        <ShopFilters
          q={q}
          categorySlug={category}
          subcategorySlug={activeSubcategory?.slug ?? subcategory}
          minPrice={minPrice}
          maxPrice={maxPrice}
          sort={sort}
          categories={tree}
          activeCategory={activeCategory ? { slug: activeCategory.slug, name: activeCategory.name } : null}
          subcategories={subcategoriesForUi}
          facets={facets}
          attributeParams={attributeParams}
        />

        <div className="lg:col-span-3">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No products found.</p>
              {q && (
                <p className="text-sm text-gray-400 mt-2">
                  Try adjusting your search or clearing filters.
                </p>
              )}
              <LinkReset />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {filtered.map((product: any) => (
                <ProductCard key={product.id} product={toProductCard(product)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function LinkReset() {
  return (
    <a
      href="/shop"
      className="inline-block mt-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
    >
      View All Products
    </a>
  );
}
