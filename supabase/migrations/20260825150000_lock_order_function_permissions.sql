-- ============================================================================
-- Janya Creations — Phase 5B: Fix trusted function EXECUTE permissions
-- Migration 0009
--
-- Discovery during verification: Supabase's default ACL grants EXECUTE to
-- PUBLIC and explicitly to anon/authenticated on newly created functions.
-- Migration 0008 revoked only the explicit role grants, leaving PUBLIC (and,
-- for admin_update_order_status, an explicit anon grant) able to execute the
-- trusted SECURITY DEFINER functions.
--
-- This migration fully locks them down:
--   confirm_order_payment / decrement_product_stock / generate_order_number /
--   orders_auto_order_number  → service_role ONLY
--   admin_update_order_status → authenticated ONLY (self-checks is_admin())
-- ============================================================================

revoke all on function public.confirm_order_payment(uuid, text, text) from public, anon, authenticated;
revoke all on function public.decrement_product_stock(uuid, integer) from public, anon, authenticated;
revoke all on function public.generate_order_number() from public, anon, authenticated;
revoke all on function public.orders_auto_order_number() from public, anon, authenticated;

revoke all on function public.admin_update_order_status(uuid, text) from public, anon;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;
