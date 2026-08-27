-- ============================================================================
-- Janya Creations — Universal size options (incl. Free Size) on cart items
-- Migration 0014
--
-- cart_items gains a `variant` column so a cart can hold the same product in
-- multiple sizes (e.g. "M" and "Free Size") as separate lines. The previous
-- unique (cart_id, product_id) is widened to unique (cart_id, product_id,
-- variant). Existing rows keep variant = '' (no variant selected).
--
-- RLS is unchanged — the user-scoped cart_items policies already cover the
-- whole row, including the new column.
-- ============================================================================
BEGIN;

alter table public.cart_items add column if not exists variant text not null default '';

alter table public.cart_items drop constraint if exists cart_items_cart_id_product_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.cart_items'::regclass
      and conname = 'cart_items_cart_product_variant_key'
  ) then
    alter table public.cart_items
      add constraint cart_items_cart_product_variant_key unique (cart_id, product_id, variant);
  end if;
end $$;

COMMIT;
