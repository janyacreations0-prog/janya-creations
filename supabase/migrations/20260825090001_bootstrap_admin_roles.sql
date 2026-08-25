-- ============================================================================
-- Janya Creations — Phase 1 Foundation
-- Migration 0001: bootstrap profiles for existing auth users + assign admin roles
--
-- 1. Backfills a profile row for EVERY existing auth user (the trigger only
--    fires for newly created users, so pre-existing users have no profile yet).
-- 2. Promotes the two known administrator accounts to role = 'admin'.
--
-- The admin email addresses appear here (migration = server-side bootstrap) but
-- MUST NOT be hardcoded in frontend code.
--
-- IMPORTANT: runs as the migration owner (postgres) so it can read auth.users
-- and write profiles bypassing RLS. This is the intended, safe mechanism.
-- ============================================================================

-- Backfill profiles for all existing auth users
insert into public.profiles (id, email, full_name, phone, role)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  coalesce(u.raw_user_meta_data ->> 'phone', ''),
  'customer'
from auth.users u
on conflict (id) do nothing;

-- Promote the administrator accounts.
-- Admin identity is resolved from auth.users.email (immutable, auth-controlled)
-- via profiles.id = auth.users.id — NEVER from profiles.email, which a customer
-- can modify on their own profile row.
update public.profiles p
   set role = 'admin',
       updated_at = now()
  from auth.users u
 where p.id = u.id
   and u.email in ('kumar.anjank@gmail.com', 'admin@janyacreations.com')
   and p.role <> 'admin';

-- Sanity: report the resulting admin accounts for verification
-- (this select is informational; it produces rows in the migration output)
select p.id, p.email, p.role
  from public.profiles p
 where p.role = 'admin'
 order by p.email;
