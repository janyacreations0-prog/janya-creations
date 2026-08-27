-- ============================================================================
-- Janya Creations — Remove overly permissive authenticated-user category policies
-- Migration 0015
--
-- The "Allow authenticated users to * categories" policies (INSERT, UPDATE,
-- DELETE) each had WITH CHECK / USING = true, meaning any authenticated user
-- (not just admins) could create, modify, or delete categories. These policies
-- were redundant with the admin-only policies (categories_admin_*) that use
-- is_admin() and were the intended gate.
--
-- The admin-only policies are retained unchanged:
--   categories_admin_insert   (WITH CHECK = is_admin())
--   categories_admin_update   (USING = is_admin(), WITH CHECK = is_admin())
--   categories_admin_delete   (USING = is_admin())
--
-- After this migration:
--   Anonymous           → SELECT (via categories_select_public + Allow public read)
--   Authenticated user  → SELECT active only (via categories_select_customer)
--   Authenticated admin → SELECT all, INSERT, UPDATE, DELETE
--   Authenticated user  → INSERT/UPDATE/DELETE denied (no policy applies)
-- ============================================================================
BEGIN;

drop policy if exists "Allow authenticated users to insert categories" on public.categories;
drop policy if exists "Allow authenticated users to update categories" on public.categories;
drop policy if exists "Allow authenticated users to delete categories" on public.categories;

COMMIT;