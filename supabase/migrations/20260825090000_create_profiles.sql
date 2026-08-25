-- ============================================================================
-- Janya Creations — Phase 1 Foundation
-- Migration 0000: profiles table, roles, helpers, RLS, role-management RPC
--
-- Creates:
--   public.profiles (id FK auth.users, email, full_name, phone, role)
--   handle_new_user() trigger function + on_auth_users_created trigger
--   is_admin() helper (SECURITY DEFINER) used by all admin policies
--   admin_set_user_role() RPC for safe role management
--   RLS: users read/update only their own profile (role column not updatable
--        through table access); admins read/update all rows
--
-- Safe / idempotent. No production data is modified.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Profiles table
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  phone      text not null default '',
  role       text not null default 'customer'
             constraint profiles_role_check check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Customer and admin profiles. Role is managed only via migration or admin_set_user_role().';

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Auto-create a profile when a new auth user is registered
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so the trigger can write profiles regardless of RLS.
-- Role is ALWAYS defaulted to 'customer' — user-supplied metadata is never
-- trusted for role assignment.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger-only: invoked by the trigger, never callable by clients.
revoke execute on function public.handle_new_user() from public;

-- ---------------------------------------------------------------------------
-- 3. is_admin() helper — used by every admin RLS policy.
--    SECURITY DEFINER so policies can evaluate it without recursive RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- RLS policies on products/categories/storage and the profiles admin policies
-- invoke this function. Policy expressions are evaluated as the requesting
-- role, so the authenticated role needs EXECUTE. The default PUBLIC EXECUTE is
-- revoked; anon never evaluates a policy that calls is_admin(), so anon is not
-- granted.
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Role management — only via this RPC (no direct table update of role).
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change roles';
  end if;
  if new_role not in ('customer', 'admin') then
    raise exception 'Invalid role. Allowed values: customer, admin';
  end if;
  update public.profiles
     set role = new_role,
         updated_at = now()
   where id = target_user_id;
  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke execute on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Grants + RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

revoke all on public.profiles from anon, authenticated;

-- Own row: read + update own non-role columns
grant select on public.profiles to authenticated;
grant update (email, full_name, phone, updated_at) on public.profiles to authenticated;

-- Admins may read all rows (SELECT policy below covers it at row level);
-- role changes go through admin_set_user_role() only.

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Anonymous users have no access to profiles at all.
