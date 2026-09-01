-- ============================================================================
-- Janya Creations — COD Confirmation
-- Migration 20260901080000
--
-- SECURITY DEFINER function for atomic Cash-on-Delivery order confirmation.
-- Stock is decremented and cart is cleared at order placement (not payment),
-- so the customer cannot be oversold during the delivery window.
-- Idempotent: already-confirmed COD orders are a safe no-op.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- confirm_cod_order(p_order_id uuid)
--
-- 1. Lock the order row.
-- 2. Verify it is:
--      - payment_gateway = 'cod'
--      - status = 'pending' (hasn't been confirmed yet)
-- 3. If already confirmed (status = 'confirmed') → no-op (idempotent).
-- 4. Transition status → 'confirmed'; payment_status remains 'pending'.
-- 5. Decrement stock for each order item (reuses decrement_product_stock).
-- 6. Clear the customer's cart.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_cod_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid;
  v_status     text;
  v_gateway    text;
  v_item       record;
begin
  -- Lock the order row first so duplicate calls cannot race.
  select user_id, status, payment_gateway
    into v_user_id, v_status, v_gateway
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- Idempotent: already confirmed — safe no-op (prevents double stock decrement).
  if v_status = 'confirmed' then
    return true;
  end if;

  -- Must be a COD order in pending status.
  if v_gateway <> 'cod' then
    raise exception 'Order is not a COD order (gateway=%)', v_gateway;
  end if;

  if v_status <> 'pending' then
    raise exception 'COD order cannot be confirmed from status %', v_status;
  end if;

  update public.orders
     set status       = 'confirmed',
         updated_at   = now()
   where id = p_order_id
     and status = 'pending';

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

-- Lock down execution — only service-role can invoke this.
revoke execute on function public.confirm_cod_order(uuid) from anon, authenticated;

COMMIT;