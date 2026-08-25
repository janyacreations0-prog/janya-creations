-- ============================================================================
-- Janya Creations — Phase 1 Foundation
-- Migration 0005: products — resolve the name vs title critical issue
--
-- Phase 0 verified the products table has a `name` column and NO `title`
-- column, while the storefront reads `title`. This migration:
--   1. adds title
--   2. backfills it from name (preserving existing data)
--   3. adds a trigger so any future insert/update without a title gets one
--      from name (covers the current admin form which writes `name`)
--   4. enforces NOT NULL (safe because of the backfill + trigger)
--
-- The old `name` column is intentionally kept — the full product schema
-- redesign (SKU, slug, MRP, status, etc.) is Phase 2.
-- ============================================================================

alter table public.products add column if not exists title text;

-- Backfill existing rows from name (never leave a NULL title)
update public.products
   set title = coalesce(nullif(trim(name), ''), 'Untitled Product')
 where title is null or trim(title) = '';

-- Keep title in sync for any writer that sets name but not title
create or replace function public.products_fill_title()
returns trigger
language plpgsql
as $$
begin
  if new.title is null or trim(new.title) = '' then
    new.title := new.name;
  end if;
  return new;
end;
$$;

drop trigger if exists products_fill_title on public.products;
create trigger products_fill_title
  before insert or update of name, title on public.products
  for each row execute function public.products_fill_title();

alter table public.products alter column title set not null;
