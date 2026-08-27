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
import ShopToolbar from '@/components/shop/ShopToolbar';
import Pagination from '@/components/shop/Pagination';
import { getReviewSummaries } from '@/lib/reviews';
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

  // --- Pagination (database-level, 24 per page) ---
  const PAGE_SIZE = 24;
  const currentPage = Math.max(1, parseInt(first(sp.page), 10) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const min = Number(minPrice);
  const max = Number(maxPrice);

  // Base filters (search / category / price) — shared by count, page and facets
  const applyBaseFilters = (builder: any) => {
    let b = builder;
    if (q) b = b.ilike('name', `%${q}%`);
    if (category && !categoryNotFound) b = b.in('category_id', categoryIds);
    if (categoryNotFound) b = b.in('category_id', ['00000000-0000-0000-0000-000000000000']);
    if (minPrice !== '' && !Number.isNaN(min) && min >= 0) b = b.gte('price', min);
    if (maxPrice !== '' && !Number.isNaN(max) && max >= 0) b = b.lte('price', max);
    return b;
  };

  // Effective attribute schema for the active category (parent merged)
  let schema: CategoryAttributeDefinition[] = [];
  if (activeSubcategory) {
    schema = mergeAttributeSchemas(
      activeCategory?.attribute_schema ?? null,
      activeSubcategory.attribute_schema ?? null
    );
  } else if (activeCategory) {
    schema = activeCategory.attribute_schema ?? [];
  }

  // Attribute filters applied at the DATABASE level (JSONB containment).
  const attrKeys = schema.map((d) => d.key);
  const applyAttrFilters = (builder: any) => {
    let b = builder;
    for (const key of attrKeys) {
      const param = sp[key];
      if (!param) continue;
      const values = Array.isArray(param) ? param : [param];
      const def = schema.find((d) => d.key === key);
      if (!def) continue;
      if (def.type === 'boolean') {
        b = b.contains('attributes', { [key]: values.includes('true') });
      } else if (values.length === 1) {
        b = b.contains('attributes', { [key]: values[0] });
      } else {
        b = b.or(
          values.map((v) => `attributes.cs.${JSON.stringify({ [key]: v })}`).join(',')
        );
      }
    }
    return b;
  };

  // Total matching count (attribute-filtered) for pagination.
  const { count } = await applyAttrFilters(
    applyBaseFilters(supabase.from('products').select('id', { count: 'exact', head: true }))
  );

  // Facet data: only the attributes column, over the base scope (before
  // attribute selection) so every facet reflects the full matching set.
  const { data: facetRows } = await applyBaseFilters(
    supabase.from('products').select('attributes')
  );

  // Current page: projected listing fields, sorted, paginated at DB level.
  const sortCfg = SORT_ORDERS[sort] ?? SORT_ORDERS.newest;
  const pageQuery = applyAttrFilters(
    applyBaseFilters(
      supabase
        .from('products')
        .select(
          'id, title, name, price, original_price, category_id, category, image_thumbnail, image_url, badge, stock_quantity, created_at'
        )
    )
  );
  const { data: products } = await pageQuery
    .order(sortCfg.column, { ascending: sortCfg.ascending })
    .range(from, to);
  const pageProducts = (products as any[]) || [];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Real review summaries for the current page (one batch query).
  const reviewMap = await getReviewSummaries(pageProducts.map((p: any) => String(p.id)));

  // --- Compute facets (select/multi-select/boolean) from the scoped set ---
  const allAttrRows = (facetRows as any[]) || [];
  const facets: Facet[] = schema
    .filter((d) => d.type === 'select' || d.type === 'multi-select' || d.type === 'boolean')
    .map((d) => {
      if (d.type === 'boolean') {
        const hasTrue = allAttrRows.some((p) => (p.attributes ?? {})[d.key] === true);
        return { def: d, values: hasTrue ? ['true'] : [] };
      }
      const set = new Set<string>();
      allAttrRows.forEach((p) => {
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
          <ShopToolbar
            totalCount={totalCount}
            from={pageProducts.length > 0 ? from + 1 : 0}
            to={Math.min(from + PAGE_SIZE, totalCount)}
            params={sp}
            sort={sort}
            q={q}
            activeCategoryName={activeCategory?.name}
            subcategoryName={activeSubcategory?.name}
            minPrice={minPrice}
            maxPrice={maxPrice}
            attributeParams={attributeParams}
          />

          {pageProducts.length === 0 ? (
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
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {pageProducts.map((product: any) => (
                  <ProductCard
                    key={product.id}
                    product={toProductCard(product)}
                    rating={reviewMap[String(product.id)]}
                  />
                ))}
              </div>
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                basePath="/shop"
                params={sp}
              />
            </>
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
