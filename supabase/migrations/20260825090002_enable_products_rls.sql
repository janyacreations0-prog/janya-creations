-- ============================================================================
-- Janya Creations — Phase 1 Foundation
-- Migration 0002: products RLS
--
-- Verified state (Phase 0): anonymous users could UPDATE/DELETE products.
-- Target:
--   Anonymous / authenticated customer: SELECT only
--   Admin (profiles.role = 'admin'):        SELECT / INSERT / UPDATE / DELETE
--
-- No email matching is used; role is resolved via public.is_admin().
-- ============================================================================

alter table public.products enable row level security;

-- Tighten grants: anon may never attempt writes; authenticated may attempt
-- writes but RLS below restricts them to admins.
revoke all on public.products from anon, authenticated;

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- SELECT: everyone may read the catalogue
drop policy if exists "products_select_public" on public.products;
create policy "products_select_public"
  on public.products for select
  to anon, authenticated
  using (true);

-- INSERT / UPDATE / DELETE: admins only
drop policy if exists "products_admin_insert" on public.products;
create policy "products_admin_insert"
  on public.products for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "products_admin_update" on public.products;
create policy "products_admin_update"
  on public.products for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "products_admin_delete" on public.products;
create policy "products_admin_delete"
  on public.products for delete
  to authenticated
  using (public.is_admin());
