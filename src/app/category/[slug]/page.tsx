import { notFound } from 'next/navigation';
import { getCategoryBySlug, getCategoryById, getSubcategories } from '@/lib/categories';
import { getProductsByCategoryIds } from '@/lib/products';
import { TopLevelCategoryView, SubcategoryCategoryView } from '@/components/category/CategoryViews';

const PAGE_SIZE = 24;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  // Subcategory accessed directly via /category/<subslug>
  if (category.parent_id) {
    const parent = await getCategoryById(String(category.parent_id));
    const { products, count } = await getProductsByCategoryIds([String(category.id)], { from, to });
    return (
      <SubcategoryCategoryView
        category={category}
        parent={parent}
        products={products}
        totalCount={count}
        page={page}
        basePath={`/category/${category.slug}`}
      />
    );
  }

  // Top-level category
  const subcategories = await getSubcategories(String(category.id));
  const categoryIds = [String(category.id), ...subcategories.map((s) => String(s.id))];
  const { products, count } = await getProductsByCategoryIds(categoryIds, { from, to });
  return (
    <TopLevelCategoryView
      category={category}
      subcategories={subcategories}
      products={products}
      totalCount={count}
      page={page}
      basePath={`/category/${category.slug}`}
    />
  );
}
