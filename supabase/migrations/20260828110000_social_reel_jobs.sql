-- ============================================================================
-- Janya Creations — Phase 2: Social Reel Factory (content job system)
-- Migration 0018
--
-- Stable reel ID sequence, job lifecycle, creative version history, and a
-- private storage bucket for generated video files.
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Reel ID sequence (stable public IDs: reel_000001, reel_000002…)
-- ---------------------------------------------------------------------------
create sequence if not exists public.social_reel_id_seq start 1;

create or replace function public.next_social_reel_id()
returns text
language sql
volatile
set search_path = public
as $$
  select 'reel_' || lpad(nextval('public.social_reel_id_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------------
-- 2. Social Reel Jobs (one row per product + template = content item)
-- ---------------------------------------------------------------------------
create table if not exists public.social_reel_jobs (
  id                uuid primary key default gen_random_uuid(),
  reel_id           text not null unique,          -- stable public ID
  product_id        uuid not null references public.products (id) on delete cascade,
  template          text not null,
  creative_version  integer not null default 1,
  status            text not null default 'draft'
                    check (status in ('draft','generating','ready','approved','failed')),
  video_url         text,
  thumbnail_url     text,
  caption           text,
  destination_url   text,
  tracking_url      text,
  scheduled_at      timestamptz,
  generated_at      timestamptz,
  approved_at       timestamptz,
  error_message     text,
  attempt_count     integer not null default 0,
  created_by        uuid references auth.users (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists social_reel_jobs_product_idx on public.social_reel_jobs (product_id);
create index if not exists social_reel_jobs_status_idx on public.social_reel_jobs (status);
create index if not exists social_reel_jobs_created_at_idx on public.social_reel_jobs (created_at desc);

-- A product should have at most one content item per template (different
-- creative variants = version increments). Relax later if needed.
create unique index if not exists social_reel_jobs_product_template_idx
  on public.social_reel_jobs (product_id, template);

-- ---------------------------------------------------------------------------
-- 3. Creative Version History (append-only, preserves previous versions)
-- ---------------------------------------------------------------------------
create table if not exists public.social_reel_versions (
  id            uuid primary key default gen_random_uuid(),
  reel_job_id   uuid not null references public.social_reel_jobs (id) on delete cascade,
  version       integer not null,
  video_url     text,
  thumbnail_url text,
  caption       text,
  status        text not null default 'ready',
  error_message text,
  created_at    timestamptz not null default now(),
  unique (reel_job_id, version)
);

create index if not exists social_reel_versions_job_idx on public.social_reel_versions (reel_job_id);

-- ---------------------------------------------------------------------------
-- 4. RLS — admin-only (same pattern as visit_sessions / analytics_events)
-- ---------------------------------------------------------------------------
alter table public.social_reel_jobs enable row level security;
alter table public.social_reel_versions enable row level security;

create policy "social_reel_jobs_select_admin"
  on public.social_reel_jobs for select to authenticated
  using (public.is_admin());

create policy "social_reel_jobs_insert_admin"
  on public.social_reel_jobs for insert to authenticated
  with check (public.is_admin());

create policy "social_reel_jobs_update_admin"
  on public.social_reel_jobs for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "social_reel_jobs_delete_admin"
  on public.social_reel_jobs for delete to authenticated
  using (public.is_admin());

create policy "social_reel_versions_select_admin"
  on public.social_reel_versions for select to authenticated
  using (public.is_admin());

create policy "social_reel_versions_insert_admin"
  on public.social_reel_versions for insert to authenticated
  with check (public.is_admin());

create policy "social_reel_versions_delete_admin"
  on public.social_reel_versions for delete to authenticated
  using (public.is_admin());

revoke all on public.social_reel_jobs from anon;
revoke all on public.social_reel_versions from anon;
grant select, insert, update, delete on public.social_reel_jobs to authenticated;
grant select, insert, delete on public.social_reel_versions to authenticated;

-- next_social_reel_id is used by the trusted server-side client only.
revoke execute on function public.next_social_reel_id() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Private storage bucket for generated videos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('social-reels', 'social-reels', false)
on conflict (id) do nothing;

-- Service-role bypasses RLS — the bucket is private and only accessed via
-- signed URLs generated by the server-side admin client. No public policies.

COMMIT;