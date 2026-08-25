-- ============================================================================
-- Janya Creations — Phase 1 Foundation
-- Migration 0003: categories RLS
--
-- Target:
--   Anonymous / authenticated customer: SELECT only
--   Admin:                              SELECT / INSERT / UPDATE / DELETE
--
-- Verified in Phase 0 that anonymous users could update/delete categories.
-- No anonymous writes allowed after this migration.
-- ============================================================================

alter table public.categories enable row level security;

revoke all on public.categories from anon, authenticated;

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "categories_admin_insert" on public.categories;
create policy "categories_admin_insert"
  on public.categories for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update"
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete"
  on public.categories for delete
  to authenticated
  using (public.is_admin());
