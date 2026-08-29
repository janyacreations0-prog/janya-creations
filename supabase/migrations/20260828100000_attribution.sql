-- ============================================================================
-- Janya Creations — Phase 1: First-party attribution & conversion tracking
-- Migration 0017
--
-- Anonymous visit-session attribution (first-touch / last-touch) plus a
-- lightweight funnel-event table. Strictly NON-PII: no IPs, no names, no
-- contact data — only marketing/attribution signals.
--
-- Writes happen ONLY through the trusted server-side service-role client
-- (server actions / route handlers), so there are NO anon or authenticated
-- INSERT policies. Admins read via is_admin(). Orders gain a historical
-- `attribution` JSONB snapshot taken at order-creation time (never changes
-- afterwards).
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Visit sessions (first-touch / last-touch attribution)
-- ---------------------------------------------------------------------------
create table if not exists public.visit_sessions (
  session_id         uuid primary key,
  first_source       text not null default 'direct',
  first_medium       text,
  first_campaign     text,
  first_content      text,
  first_ref          text,
  first_landing_path text,
  last_source        text not null default 'direct',
  last_medium        text,
  last_campaign      text,
  last_content       text,
  last_ref           text,
  last_landing_path  text,
  first_seen_at      timestamptz not null default now(),
  last_seen_at       timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists visit_sessions_last_source_idx on public.visit_sessions (last_source);
create index if not exists visit_sessions_last_campaign_idx on public.visit_sessions (last_campaign);
create index if not exists visit_sessions_last_content_idx on public.visit_sessions (last_content);
create index if not exists visit_sessions_last_seen_idx on public.visit_sessions (last_seen_at desc);

-- ---------------------------------------------------------------------------
-- 2. Funnel events
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid, -- anonymous session id (indexed; intentionally no FK — events
                   -- must never block the funnel if a session row is missing)
  event_name text not null,
  product_id uuid references public.products (id) on delete set null,
  order_id   uuid references public.orders (id) on delete set null,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_session_idx on public.analytics_events (session_id);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_product_idx on public.analytics_events (product_id);
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Order attribution snapshot (historical, immutable per order)
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists attribution jsonb;

-- ---------------------------------------------------------------------------
-- 4. RLS — server-side writes only, admin reads
-- ---------------------------------------------------------------------------
alter table public.visit_sessions enable row level security;
alter table public.analytics_events enable row level security;

create policy "visit_sessions_select_admin"
  on public.visit_sessions for select to authenticated
  using (public.is_admin());

create policy "visit_sessions_update_admin"
  on public.visit_sessions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "visit_sessions_delete_admin"
  on public.visit_sessions for delete to authenticated
  using (public.is_admin());

create policy "analytics_events_select_admin"
  on public.analytics_events for select to authenticated
  using (public.is_admin());

create policy "analytics_events_delete_admin"
  on public.analytics_events for delete to authenticated
  using (public.is_admin());

-- No anon grants at all. Authenticated users may read/write only via the
-- admin policies above (service-role server writes bypass RLS entirely).
revoke all on public.visit_sessions from anon;
revoke all on public.analytics_events from anon;
grant select, update, delete on public.visit_sessions to authenticated;
grant select, delete on public.analytics_events to authenticated;

COMMIT;
