-- ============================================================================
-- Janya Creations — Mark order paid WITHOUT stock decrement
-- Migration 20260903090000
--
-- Used ONLY when a previously confirmed COD order is later paid online via the
-- "Pay Now" email button. A COD order already had stock decremented and the
-- cart cleared atomically at placement (confirm_cod_order). When the customer
-- later completes an online payment for that SAME order we must mark it paid
-- WITHOUT decrementing stock a second time (double decrement would corrupt
-- inventory). Stock/cart are intentionally untouched here.
-- ============================================================================

BEGIN;

create or replace function public.mark_order_paid_no_stock(
  p_order_id            uuid,
  p_gateway             text default 'cashfree',
  p_gateway_payment_id  text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay_status text;
begin
  select payment_status
    into v_pay_status
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- Idempotent: already paid → safe no-op.
  if v_pay_status = 'paid' then
    return true;
  end if;

  if v_pay_status <> 'pending' then
    raise exception 'Order cannot be marked paid from payment status %', v_pay_status;
  end if;

  -- Mark paid; do NOT touch status/stock/cart (already reserved/cleared for COD).
  update public.orders
     set payment_status      = 'paid',
         payment_gateway     = p_gateway,
         gateway_payment_id  = coalesce(p_gateway_payment_id, gateway_payment_id),
         updated_at          = now()
   where id = p_order_id
     and payment_status = 'pending';

  if not found then
    return true; -- processed by a concurrent call
  end if;

  return true;
end;
$$;

-- Lock down execution — only service-role can invoke this.
revoke execute on function public.mark_order_paid_no_stock(uuid, text, text) from anon, authenticated;

COMMIT;