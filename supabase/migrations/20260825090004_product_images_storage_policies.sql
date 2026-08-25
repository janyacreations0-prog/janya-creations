-- ============================================================================
-- Janya Creations — Phase 1 Foundation
-- Migration 0004: product-images storage policies
--
-- Bucket: product-images (exists, PUBLIC — storefront images must load for
-- anonymous visitors, so public READ is intentionally preserved).
--
-- Target:
--   READ        (select/list):   anon + authenticated  (bucket stays public)
--   INSERT/UPDATE/DELETE uploads: authenticated admins only
--
-- Defensive cleanup first: any pre-existing policy on storage.objects that
-- references the product-images bucket is dropped so old permissive anon
-- upload/delete policies cannot survive alongside the new ones.
-- ============================================================================

-- --- 1. Remove any existing policies that touch product-images -------------
do $$
declare p record;
begin
  for p in
    select policyname
      from pg_policies
     where schemaname = 'storage'
       and tablename = 'objects'
       and (
             qual like '%product-images%'
             or with_check like '%product-images%'
           )
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

-- --- 2. Public read / list --------------------------------------------------
drop policy if exists "product_images_select_public" on storage.objects;
create policy "product_images_select_public"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

-- --- 3. Admin-only write operations ----------------------------------------
drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- Existing product images are untouched. Public GET on the bucket still works.
