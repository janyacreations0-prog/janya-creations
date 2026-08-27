import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/categories';
import { getProductsByCategoryIds } from '@/lib/products';
import { SubcategoryCategoryView } from '@/components/category/CategoryViews';
import { breadcrumbJsonLd, absoluteUrl, SITE_NAME } from '@/lib/seo';
import JsonLd from '@/components/seo/JsonLd';
import type { Metadata } from 'next';

const PAGE_SIZE = 24;

function categoryDescription(category: { name: string; description?: string | null }): string {
  if (category.description && category.description.trim()) {
    return category.description.trim();
  }
  return `Shop ${category.name} online at ${SITE_NAME}. Discover real pieces in this collection.`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; subslug: string }>;
}): Promise<Metadata> {
  const { slug, subslug } = await params;
  const parent = await getCategoryBySlug(slug);
  if (!parent) return { title: 'Category Not Found', robots: { index: false } };
  const subcategory = await getCategoryBySlug(subslug);
  if (!subcategory || String(subcategory.parent_id) !== String(parent.id)) {
    return { title: 'Category Not Found', robots: { index: false } };
  }

  const canonical = `/category/${parent.slug}/${subcategory.slug}`;
  return {
    title: subcategory.name,
    description: categoryDescription(subcategory),
    alternates: { canonical },
    openGraph: {
      title: `${subcategory.name} | ${SITE_NAME}`,
      description: categoryDescription(subcategory),
      url: absoluteUrl(canonical),
      type: 'website',
    },
  };
}

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
  const crumbs = breadcrumbJsonLd([
    { name: 'Home', url: absoluteUrl('/') },
    { name: parent.name, url: absoluteUrl(`/category/${parent.slug}`) },
    { name: subcategory.name, url: absoluteUrl(`/category/${parent.slug}/${subcategory.slug}`) },
  ]);
  return (
    <>
      <JsonLd data={crumbs} />
      <SubcategoryCategoryView
        category={subcategory}
        parent={parent}
        products={products}
        totalCount={count}
        page={page}
        basePath={`/category/${parent.slug}/${subcategory.slug}`}
      />
    </>
  );
}