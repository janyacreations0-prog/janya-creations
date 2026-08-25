import { notFound } from 'next/navigation';
import { getCategoryBySlug, getCategoryById, getSubcategories } from '@/lib/categories';
import { getProductsByCategoryIds } from '@/lib/products';
import { TopLevelCategoryView, SubcategoryCategoryView } from '@/components/category/CategoryViews';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  // Subcategory accessed directly via /category/<subslug>
  if (category.parent_id) {
    const parent = await getCategoryById(String(category.parent_id));
    const products = await getProductsByCategoryIds([String(category.id)]);
    return <SubcategoryCategoryView category={category} parent={parent} products={products} />;
  }

  // Top-level category
  const subcategories = await getSubcategories(String(category.id));
  const categoryIds = [String(category.id), ...subcategories.map((s) => String(s.id))];
  const products = await getProductsByCategoryIds(categoryIds);
  return (
    <TopLevelCategoryView
      category={category}
      subcategories={subcategories}
      products={products}
    />
  );
}