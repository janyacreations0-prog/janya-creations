-- ============================================================================
-- Janya Creations — Fix production checkout (order creation + saved addresses)
-- Migration 0012
--
-- 1. ROOT CAUSE FIX: authenticated order inserts fail with
--      "permission denied for function generate_order_number"
--    Migration 0008 revoked EXECUTE on generate_order_number() from
--    authenticated, but the orders_auto_order_number BEFORE INSERT trigger runs
--    as the inserting user and calls it. Re-grant EXECUTE to authenticated.
--
-- 2. ACL HYGIENE: the 0008 `revoke all` only targeted anon; Supabase default
--    privileges left authenticated with ALL on orders/order_items. Restrict to
--    SELECT + INSERT only (admin status updates go through the SECURITY
--    DEFINER admin_update_order_status RPC, which is unaffected).
--
-- 3. Saved addresses: new user-scoped `addresses` table (used by the checkout
--    "save this address" option).
-- ============================================================================
BEGIN;

-- 1. Order-number generator must be executable by authenticated (trigger path)
grant execute on function public.generate_order_number() to authenticated;

-- 2. Tighten table ACLs on orders / order_items
revoke all on public.orders from authenticated;
revoke all on public.order_items from authenticated;
grant select, insert on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;

-- 3. Saved addresses
create table if not exists public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  full_name  text not null,
  phone      text not null,
  line1      text not null,
  line2      text,
  city       text not null,
  state      text not null,
  pincode    text not null,
  country    text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists addresses_user_id_idx on public.addresses (user_id);

alter table public.addresses enable row level security;

create policy "addresses_select_own"
  on public.addresses for select to authenticated
  using (user_id = auth.uid());

create policy "addresses_insert_own"
  on public.addresses for insert to authenticated
  with check (user_id = auth.uid());

create policy "addresses_update_own"
  on public.addresses for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "addresses_delete_own"
  on public.addresses for delete to authenticated
  using (user_id = auth.uid());

revoke all on public.addresses from anon;
grant select, insert, update, delete on public.addresses to authenticated;

COMMIT;
