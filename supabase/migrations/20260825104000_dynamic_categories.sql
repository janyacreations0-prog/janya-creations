-- ============================================================================
-- Janya Creations — Phase 2: Dynamic Category Hierarchy
-- Migration 0006
--
-- Extends the existing `categories` table into a dynamic Category → Subcategory
-- hierarchy (ONE level only) and links products via products.category_id.
--
-- - Extends categories: slug, description, image_url, parent_id, is_active,
--   sort_order, attribute_schema, updated_at
-- - Enforces one-level nesting via a trigger (a subcategory cannot be a parent)
-- - Auto-generates slugs via a slugify() helper + trigger (admin can override)
-- - Seeds the 4 initial top-level categories + their subcategories (idempotent)
-- - Adds products.category_id (FK, ON DELETE SET NULL) + products.attributes
-- - Keeps the legacy products.category text column (marked LEGACY)
-- - RLS: anon/customer read only ACTIVE categories; admins read/write all
--
-- SAFE / IDEMPOTENT. Does NOT delete or remap existing data.
-- Existing products keep category_id = NULL until assigned by the admin.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helpers (slugify + triggers)
-- ---------------------------------------------------------------------------
create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select lower(
    regexp_replace(
      regexp_replace(coalesce(trim(value), ''), '\s+', '-', 'g'),
      '[^a-z0-9\-]', '', 'g'
    )
  );
$$;

-- Auto-generate slug from name when not explicitly provided
create or replace function public.categories_auto_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or trim(new.slug) = '' then
    new.slug := public.slugify(new.name);
  end if;
  return new;
end;
$$;

-- One-level hierarchy protection: a subcategory cannot become the parent of
-- another subcategory.
create or replace function public.categories_prevent_nested_subcategories()
returns trigger
language plpgsql
as $$
declare
  parent_has_parent boolean;
begin
  if new.parent_id is not null then
    select (parent_id is not null)
      into parent_has_parent
      from public.categories
     where id = new.parent_id;
    if parent_has_parent then
      raise exception 'Subcategories cannot contain further subcategories';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Extend categories table
-- ---------------------------------------------------------------------------
alter table public.categories
  add column if not exists slug           text,
  add column if not exists description    text,
  add column if not exists image_url      text,
  add column if not exists parent_id      uuid references public.categories (id) on delete set null,
  add column if not exists is_active      boolean not null default true,
  add column if not exists sort_order     integer not null default 0,
  add column if not exists attribute_schema jsonb not null default '[]'::jsonb,
  add column if not exists updated_at     timestamptz not null default now();

-- Backfill slug for existing rows (e.g. the legacy "Uncategorized" category)
update public.categories
   set slug = public.slugify(name)
 where slug is null or trim(slug) = '';

-- Slug must be present and unique
alter table public.categories alter column slug set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categories_slug_unique'
  ) then
    alter table public.categories
      add constraint categories_slug_unique unique (slug);
  end if;
end $$;

-- Triggers
drop trigger if exists categories_auto_slug on public.categories;
create trigger categories_auto_slug
  before insert or update of name, slug on public.categories
  for each row execute function public.categories_auto_slug();

drop trigger if exists categories_prevent_nested_subcategories on public.categories;
create trigger categories_prevent_nested_subcategories
  before insert or update of parent_id on public.categories
  for each row execute function public.categories_prevent_nested_subcategories();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- Indexes
create index if not exists categories_parent_id_idx on public.categories (parent_id);
create index if not exists categories_active_order_idx on public.categories (is_active, sort_order, name);

-- ---------------------------------------------------------------------------
-- 3. Seed initial categories + subcategories (idempotent, keyed by slug)
-- ---------------------------------------------------------------------------
insert into public.categories (name, slug, description, is_active, sort_order)
values
  ('Artificial Jewellery', 'artificial-jewellery', null, true, 1),
  ('Women''s Clothing',    'womens-clothing',     null, true, 2),
  ('Accessories',          'accessories',          null, true, 3),
  ('Toys',                 'toys',                 null, true, 4)
on conflict (slug) do nothing;

-- Artificial Jewellery subcategories
insert into public.categories (name, slug, parent_id, is_active, sort_order)
select v.name, v.slug, p.id, true, v.ord
  from (values
    ('Earrings',          'earrings',          1),
    ('Chains',            'chains',            2),
    ('Necklaces',         'necklaces',         3),
    ('Bangles',           'bangles',           4),
    ('Bracelets',         'bracelets',         5),
    ('Rings',             'rings',             6),
    ('Maang Tikka',       'maang-tikka',       7),
    ('Anklets',           'anklets',           8),
    ('Jewellery Sets',    'jewellery-sets',    9)
  ) as v(name, slug, ord)
  join public.categories p on p.slug = 'artificial-jewellery'
on conflict (slug) do nothing;

-- Women's Clothing subcategories
insert into public.categories (name, slug, parent_id, is_active, sort_order)
select v.name, v.slug, p.id, true, v.ord
  from (values
    ('Sarees',    'sarees',    1),
    ('Suits',     'suits',     2),
    ('Kurtis',    'kurtis',    3),
    ('Lehengas',  'lehengas',  4),
    ('Dresses',   'dresses',   5),
    ('Dupattas',  'dupattas',  6)
  ) as v(name, slug, ord)
  join public.categories p on p.slug = 'womens-clothing'
on conflict (slug) do nothing;

-- Accessories subcategories
insert into public.categories (name, slug, parent_id, is_active, sort_order)
select v.name, v.slug, p.id, true, v.ord
  from (values
    ('Handbags',         'handbags',         1),
    ('Clutches',         'clutches',         2),
    ('Wallets',          'wallets',          3),
    ('Hair Accessories', 'hair-accessories', 4),
    ('Belts',            'belts',            5)
  ) as v(name, slug, ord)
  join public.categories p on p.slug = 'accessories'
on conflict (slug) do nothing;

-- Toys subcategories
insert into public.categories (name, slug, parent_id, is_active, sort_order)
select v.name, v.slug, p.id, true, v.ord
  from (values
    ('Soft Toys',         'soft-toys',         1),
    ('Educational Toys',  'educational-toys',  2),
    ('Dolls',             'dolls',             3),
    ('Games',             'games',             4)
  ) as v(name, slug, ord)
  join public.categories p on p.slug = 'toys'
on conflict (slug) do nothing;

-- Legacy "Uncategorized" row is preserved but hidden from the storefront.
update public.categories
   set is_active = false,
       updated_at = now()
 where slug = 'uncategorized'
   and is_active = true;

-- ---------------------------------------------------------------------------
-- 4. Products: category relationship + attributes
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists category_id uuid references public.categories (id) on delete set null,
  add column if not exists attributes   jsonb not null default '{}'::jsonb;

create index if not exists products_category_id_idx on public.products (category_id);

comment on column public.products.category is
  'LEGACY free-text category — kept during transition. Use category_id for all new assignment/filtering.';
comment on column public.products.category_id is
  'Points to the leaf category (subcategory if one is selected, otherwise the top-level category).';
comment on column public.categories.parent_id is
  'NULL = top-level category. Non-NULL = subcategory (one level only).';

-- ---------------------------------------------------------------------------
-- 5. RLS — customers/anonymous read only ACTIVE categories; admins read all
-- ---------------------------------------------------------------------------
drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public"
  on public.categories for select
  to anon
  using (is_active = true);

drop policy if exists "categories_select_customer" on public.categories;
create policy "categories_select_customer"
  on public.categories for select
  to authenticated
  using (is_active = true);

drop policy if exists "categories_select_admin_all" on public.categories;
create policy "categories_select_admin_all"
  on public.categories for select
  to authenticated
  using (public.is_admin());
