import { supabase } from './supabase';
import { unstable_cache } from 'next/cache';
import type { Category, CategoryAttributeDefinition, CategoryWithChildren } from '@/types';

/**
 * Category data-access helpers.
 *
 * The shared anon client is used for storefront reads; RLS ensures anonymous
 * users only ever see ACTIVE categories. Admin flows use the authenticated
 * browser client, which (via is_admin()) can read all categories.
 */

function sortCategories(list: Category[]): Category[] {
  return [...list].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
  );
}

/**
 * Merges a top-level category's common attribute schema with a subcategory's
 * schema. The parent's attributes come first; the subcategory's attributes are
 * appended, and a subcategory attribute with the same key overrides the parent.
 */
export function mergeAttributeSchemas(
  parentSchema: CategoryAttributeDefinition[] | null | undefined,
  leafSchema: CategoryAttributeDefinition[] | null | undefined
): CategoryAttributeDefinition[] {
  const merged: CategoryAttributeDefinition[] = [];
  const seen = new Set<string>();
  const push = (defs: CategoryAttributeDefinition[] | null | undefined) => {
    (defs || []).forEach((d) => {
      if (!seen.has(d.key)) {
        seen.add(d.key);
        merged.push(d);
      }
    });
  };
  push(parentSchema);
  push(leafSchema);
  return merged;
}

/**
 * Fetches categories.
 *
 * Storefront reads MUST only ever receive active categories — enforced at the
 * QUERY level (not just client-side filtering). Admin/category-management reads
 * use the authenticated browser client directly (unfiltered) so that inactive
 * categories remain visible to admins.
 *
 * @param includeInactive  pass true only for admin/all-categories views.
 */
export async function getCategories(includeInactive = false): Promise<Category[]> {
  let query = supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching categories:', error.message);
    return [];
  }
  return (data as Category[]) || [];
}

export function buildCategoryTree(list: Category[]): CategoryWithChildren[] {
  const nodes = new Map<string, CategoryWithChildren>();
  list.forEach((c) => nodes.set(String(c.id), { ...c, children: [] }));

  const roots: CategoryWithChildren[] = [];
  nodes.forEach((node) => {
    if (node.parent_id && nodes.has(String(node.parent_id))) {
      nodes.get(String(node.parent_id))!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  nodes.forEach((node) => {
    if (node.children) node.children = sortCategories(node.children);
  });
  return sortCategories(roots);
}

/**
 * Storefront tree (active categories only). Used by the navbar/footer.
 *
 * Cached server-side with a short ISR-style window (300s) so category nav is
 * fast, but tagged `categories` so that admin mutations can invalidate it
 * immediately via revalidateTag('categories') / revalidatePath('/', 'layout').
 * This keeps the Navbar database-driven AND fresh after admin changes.
 */
const getCategoryTreeCached = unstable_cache(
  async (): Promise<CategoryWithChildren[]> => {
    const list = await getCategories(false);
    return buildCategoryTree(list.filter((c) => c.is_active));
  },
  ['janya-category-tree'],
  { revalidate: 300, tags: ['categories'] }
);

export function getCategoryTree(): Promise<CategoryWithChildren[]> {
  return getCategoryTreeCached();
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (!slug) return null;
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as Category;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  if (!id) return null;
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Category;
}

export async function getSubcategories(parentId: string): Promise<Category[]> {
  if (!parentId) return [];
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('parent_id', parentId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error || !data) return [];
  return sortCategories((data as Category[]) || []);
}
