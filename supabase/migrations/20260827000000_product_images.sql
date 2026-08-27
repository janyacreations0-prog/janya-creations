-- ============================================================================
-- Janya Creations — Admin: product images gallery (up to 4 per product)
-- Migration 0013
--
-- Adds a normalized product_images table for multi-image support while the
-- legacy single-image columns (image_url/image_large/image_medium/
-- image_thumbnail) are preserved for backward compatibility — existing
-- products keep working and the storefront (which reads the legacy columns)
-- is unaffected.
--
-- RLS: images are publicly readable (like products); writes are admin-only.
-- ============================================================================
BEGIN;

create table if not exists public.product_images (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  position       integer not null default 0 check (position between 0 and 3),
  original_url   text,
  large_url      text,
  medium_url     text,
  thumbnail_url  text,
  created_at     timestamptz not null default now(),
  unique (product_id, position)
);

create index if not exists product_images_product_idx on public.product_images (product_id);

alter table public.product_images enable row level security;

-- Public read (products are public; their gallery images are public too).
create policy "product_images_select_public"
  on public.product_images for select to anon, authenticated
  using (true);

-- Admin-only writes (matching the products write model).
create policy "product_images_insert_admin"
  on public.product_images for insert to authenticated
  with check (public.is_admin());

create policy "product_images_update_admin"
  on public.product_images for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "product_images_delete_admin"
  on public.product_images for delete to authenticated
  using (public.is_admin());

revoke all on public.product_images from anon;
grant select on public.product_images to anon;
grant select, insert, update, delete on public.product_images to authenticated;

COMMIT;
