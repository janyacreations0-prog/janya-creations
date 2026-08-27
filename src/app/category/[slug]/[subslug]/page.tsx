import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/categories';
import { getProductsByCategoryIds } from '@/lib/products';
import { SubcategoryCategoryView } from '@/components/category/CategoryViews';

const PAGE_SIZE = 24;

export default async function SubcategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; subslug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug, subslug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || '1', 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const parent = await getCategoryBySlug(slug);
  if (!parent) notFound();

  const subcategory = await getCategoryBySlug(subslug);
  if (!subcategory || String(subcategory.parent_id) !== String(parent.id)) notFound();

  const { products, count } = await getProductsByCategoryIds([String(subcategory.id)], { from, to });
  return (
    <SubcategoryCategoryView
      category={subcategory}
      parent={parent}
      products={products}
      totalCount={count}
      page={page}
      basePath={`/category/${parent.slug}/${subcategory.slug}`}
    />
  );
}