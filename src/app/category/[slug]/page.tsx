import { notFound } from 'next/navigation';
import { getCategoryBySlug, getCategoryById, getSubcategories } from '@/lib/categories';
import { getProductsByCategoryIds } from '@/lib/products';
import { TopLevelCategoryView, SubcategoryCategoryView } from '@/components/category/CategoryViews';
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
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: 'Category Not Found', robots: { index: false } };

  const title = category.name;
  const description = categoryDescription(category);

  // A subcategory reached directly at /category/<subslug> is canonicalised to
  // the nested route /category/<parent>/<subslug>.
  let canonical = `/category/${slug}`;
  if (category.parent_id) {
    const parent = await getCategoryById(String(category.parent_id));
    if (parent) canonical = `/category/${parent.slug}/${slug}`;
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: absoluteUrl(canonical),
      type: 'website',
    },
  };
}

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
    const crumbs = breadcrumbJsonLd([
      { name: 'Home', url: absoluteUrl('/') },
      ...(parent
        ? [
            {
              name: parent.name,
              url: absoluteUrl(`/category/${parent.slug}`),
            },
          ]
        : []),
      { name: category.name, url: absoluteUrl(`/category/${parent?.slug}/${slug}`) },
    ]);
    return (
      <>
        <JsonLd data={crumbs} />
        <SubcategoryCategoryView
          category={category}
          parent={parent}
          products={products}
          totalCount={count}
          page={page}
          basePath={`/category/${parent?.slug ?? slug}/${slug}`}
        />
      </>
    );
  }

  // Top-level category
  const subcategories = await getSubcategories(String(category.id));
  const categoryIds = [String(category.id), ...subcategories.map((s) => String(s.id))];
  const { products, count } = await getProductsByCategoryIds(categoryIds, { from, to });
  const crumbs = breadcrumbJsonLd([
    { name: 'Home', url: absoluteUrl('/') },
    { name: category.name, url: absoluteUrl(`/category/${category.slug}`) },
  ]);
  return (
    <>
      <JsonLd data={crumbs} />
      <TopLevelCategoryView
        category={category}
        subcategories={subcategories}
        products={products}
        totalCount={count}
        page={page}
        basePath={`/category/${category.slug}`}
      />
    </>
  );
}
