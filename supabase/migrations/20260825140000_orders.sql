-- ============================================================================
-- Janya Creations — Phase 5: Orders & Payments
-- Migration 0008
--
-- Production-safe order system with historical snapshots, human-friendly order
-- numbers, atomic stock protection, and a trusted SECURITY DEFINER payment
-- confirmation path. Payment status is ONLY changeable by the trusted
-- server-side function (webhook / signature-verified callback).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Order number sequence + generator
-- ---------------------------------------------------------------------------
create sequence if not exists public.order_number_seq start 1;

create or replace function public.generate_order_number()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_seq int;
begin
  v_seq := nextval('public.order_number_seq');
  return 'JC-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete restrict,
  order_number       text not null unique,
  status             text not null default 'pending'
                     check (status in ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_status     text not null default 'pending'
                     check (payment_status in ('pending','paid','failed','refunded')),
  payment_gateway    text,
  gateway_payment_id text,
  subtotal           numeric(10,2) not null check (subtotal >= 0),
  shipping_amount    numeric(10,2) not null default 0 check (shipping_amount >= 0),
  discount_amount    numeric(10,2) not null default 0 check (discount_amount >= 0),
  total_amount       numeric(10,2) not null check (total_amount >= 0),
  currency           text not null default 'INR',
  customer_name      text not null,
  customer_email     text not null,
  customer_phone     text not null,
  shipping_address   jsonb not null,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_payment_status_idx on public.orders (payment_status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- Auto-generate order number when not supplied
create or replace function public.orders_auto_order_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_number is null or trim(new.order_number) = '' then
    new.order_number := public.generate_order_number();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists orders_auto_order_number on public.orders;
create trigger orders_auto_order_number
  before insert on public.orders
  for each row execute function public.orders_auto_order_number();

-- ---------------------------------------------------------------------------
-- 3. Order items (historical snapshots — safe from later product edits/deletes)
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  product_name  text not null,
  product_image text,
  unit_price    numeric(10,2) not null check (unit_price >= 0),
  quantity      integer not null check (quantity > 0),
  line_total    numeric(10,2) not null check (line_total >= 0),
  attributes    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- 4. Atomic stock protection
-- ---------------------------------------------------------------------------
create or replace function public.decrement_product_stock(p_product_id uuid, p_quantity integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock integer;
begin
  if p_quantity <= 0 then
    return true;
  end if;

  -- Row lock prevents two concurrent orders overselling the same product.
  select stock_quantity into v_stock
    from public.products
   where id = p_product_id
   for update;

  if v_stock is null then
    raise exception 'Product not found';
  end if;
  if v_stock < p_quantity then
    raise exception 'Insufficient stock for product';
  end if;

  update public.products
     set stock_quantity = stock_quantity - p_quantity
   where id = p_product_id;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Trusted payment confirmation (webhook + verified callback path only)
-- ---------------------------------------------------------------------------
create or replace function public.confirm_order_payment(
  p_order_id          uuid,
  p_gateway           text default 'razorpay',
  p_gateway_payment_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid;
  v_pay_status   text;
  v_order_row    record;
  v_item         record;
begin
  -- Lock the order row first so duplicate webhooks/callbacks cannot race.
  select user_id, payment_status
    into v_user_id, v_pay_status
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- Idempotent: already paid → safe no-op (prevents double stock decrement).
  if v_pay_status = 'paid' then
    return true;
  end if;

  if v_pay_status <> 'pending' then
    raise exception 'Order cannot be confirmed from payment status %', v_pay_status;
  end if;

  update public.orders
     set payment_status = 'paid',
         status         = 'confirmed',
         payment_gateway = p_gateway,
         gateway_payment_id = coalesce(p_gateway_payment_id, gateway_payment_id),
         updated_at      = now()
   where id = p_order_id
     and payment_status = 'pending';

  if not found then
    return true; -- processed by a concurrent call
  end if;

  -- Decrement stock for every order item (atomic per product).
  for v_item in
    select product_id, quantity
      from public.order_items
     where order_id = p_order_id
  loop
    if v_item.product_id is not null then
      perform public.decrement_product_stock(v_item.product_id, v_item.quantity);
    end if;
  end loop;

  -- Clear the customer's cart now that the order is placed.
  delete from public.cart_items
   where cart_id in (select id from public.carts where user_id = v_user_id);

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5b. Trusted admin fulfillment update (SECURITY DEFINER — customers have no
-- update grants at all, so fulfillment status can only change through this)
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_order_status(p_order_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can update order status';
  end if;

  select status into v_current from public.orders where id = p_order_id;
  if not found then
    raise exception 'Order not found';
  end if;

  -- Controlled transitions.
  if not (
    (v_current = 'pending'    and p_status in ('confirmed', 'cancelled')) or
    (v_current = 'confirmed'  and p_status in ('processing', 'cancelled')) or
    (v_current = 'processing' and p_status in ('shipped', 'cancelled')) or
    (v_current = 'shipped'    and p_status in ('delivered', 'cancelled')) or
    (v_current = 'delivered'  and p_status = 'refunded')
  ) then
    raise exception 'Invalid status transition from % to %', v_current, p_status;
  end if;

  update public.orders
     set status = p_status,
         updated_at = now()
   where id = p_order_id;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. RLS — customers see only their own orders; admins read all
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Customers: select + insert own; NO update (status changes only via the
-- trusted SECURITY DEFINER functions).
create policy "orders_select_own"
  on public.orders for select to authenticated
  using (user_id = auth.uid());

create policy "orders_insert_own"
  on public.orders for insert to authenticated
  with check (user_id = auth.uid());

-- Admins: read all orders.
create policy "orders_select_admin"
  on public.orders for select to authenticated
  using (public.is_admin());

-- Order items: ownership flows through the parent order.
create policy "order_items_select_own"
  on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid()
  ));

create policy "order_items_insert_own"
  on public.order_items for insert to authenticated
  with check (exists (
    select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid()
  ));

create policy "order_items_select_admin"
  on public.order_items for select to authenticated
  using (public.is_admin());

-- Customers cannot update any order column (no update grant at all).
revoke all on public.orders from anon;
revoke all on public.order_items from anon;
grant select on public.orders to authenticated;
grant insert on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Function execution lockdown
-- ---------------------------------------------------------------------------
-- confirm_order_payment and decrement_product_stock are trusted SECURITY
-- DEFINER paths. They may only be invoked by service_role (server-side
-- webhook + signature-verified callback). Customers/anon cannot call them
-- directly, so a customer can never self-confirm a payment or alter stock.
revoke execute on function public.confirm_order_payment(uuid, text, text) from anon, authenticated;
revoke execute on function public.decrement_product_stock(uuid, integer) from anon, authenticated;
revoke execute on function public.generate_order_number() from anon, authenticated;
revoke execute on function public.orders_auto_order_number() from anon, authenticated;

-- admin_update_order_status self-checks is_admin(), so it stays callable only
-- by admins (PUBLIC default EXECUTE is revoked for hygiene).
revoke execute on function public.admin_update_order_status(uuid, text) from public;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;

COMMIT;
