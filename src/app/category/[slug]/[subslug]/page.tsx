import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/categories';
import { getProductsByCategoryIds } from '@/lib/products';
import { SubcategoryCategoryView } from '@/components/category/CategoryViews';

export default async function SubcategoryPage({
  params,
}: {
  params: Promise<{ slug: string; subslug: string }>;
}) {
  const { slug, subslug } = await params;

  const parent = await getCategoryBySlug(slug);
  if (!parent) notFound();

  const subcategory = await getCategoryBySlug(subslug);
  if (!subcategory || String(subcategory.parent_id) !== String(parent.id)) notFound();

  const products = await getProductsByCategoryIds([String(subcategory.id)]);
  return (
    <SubcategoryCategoryView
      category={subcategory}
      parent={parent}
      products={products}
    />
  );
}
