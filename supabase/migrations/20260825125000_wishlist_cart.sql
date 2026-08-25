-- ============================================================================
-- Janya Creations — Phase 4: Wishlist + Cart
-- Migration 0007
--
-- Server-side wishlist and cart for authenticated customers.
--   wishlist_items : user_id + product_id (unique pair)
--   carts          : one per user
--   cart_items     : product_id + quantity per cart (unique cart/product)
--
-- RLS: every table is strictly user-scoped (own rows only). Anonymous users
-- have no server-side cart/wishlist access. Admins are NOT granted access to
-- other customers' private data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Wishlist
-- ---------------------------------------------------------------------------
create table if not exists public.wishlist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists wishlist_items_user_id_idx on public.wishlist_items (user_id);
create index if not exists wishlist_items_product_id_idx on public.wishlist_items (product_id);

alter table public.wishlist_items enable row level security;

create policy "wishlist_items_select_own"
  on public.wishlist_items for select to authenticated
  using (user_id = auth.uid());

create policy "wishlist_items_insert_own"
  on public.wishlist_items for insert to authenticated
  with check (user_id = auth.uid());

create policy "wishlist_items_update_own"
  on public.wishlist_items for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "wishlist_items_delete_own"
  on public.wishlist_items for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Carts
-- ---------------------------------------------------------------------------
create table if not exists public.carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.carts enable row level security;

create policy "carts_select_own"
  on public.carts for select to authenticated
  using (user_id = auth.uid());

create policy "carts_insert_own"
  on public.carts for insert to authenticated
  with check (user_id = auth.uid());

create policy "carts_update_own"
  on public.carts for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "carts_delete_own"
  on public.carts for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Cart items
-- ---------------------------------------------------------------------------
create table if not exists public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  cart_id    uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity   integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create index if not exists cart_items_cart_id_idx on public.cart_items (cart_id);
create index if not exists cart_items_product_id_idx on public.cart_items (product_id);

alter table public.cart_items enable row level security;

-- Ownership is resolved through the item's cart -> cart.user_id = auth.uid()
create policy "cart_items_select_own"
  on public.cart_items for select to authenticated
  using (exists (
    select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()
  ));

create policy "cart_items_insert_own"
  on public.cart_items for insert to authenticated
  with check (exists (
    select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()
  ));

create policy "cart_items_update_own"
  on public.cart_items for update to authenticated
  using (exists (
    select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()
  ));

create policy "cart_items_delete_own"
  on public.cart_items for delete to authenticated
  using (exists (
    select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------------
-- Anonymous users have no access to any of these tables.
revoke all on public.wishlist_items, public.carts, public.cart_items from anon;

grant select, insert, update, delete on public.wishlist_items to authenticated;
grant select, insert, update, delete on public.carts to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;
