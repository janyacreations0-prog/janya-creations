-- ============================================================================
-- Janya Creations — Homepage social proof: product reviews
-- Migration 0011
--
-- Shared product_reviews data source used by the homepage review carousel AND
-- the product review system (Phase 7). The homepage shows ONLY approved
-- reviews; the review submission/approval workflow plugs into this table.
--
-- RLS:
--   - anon/authenticated: SELECT approved reviews only
--   - authenticated: insert own review; update/delete own pending review
--   - admins: read all + moderate (approve/reject)
-- ============================================================================

create table if not exists public.product_reviews (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references public.products (id) on delete cascade,
  user_id               uuid references auth.users (id) on delete set null,
  customer_name         text not null,
  rating                integer not null check (rating between 1 and 5),
  review_text           text,
  status                text not null default 'pending'
                        check (status in ('pending','approved','rejected')),
  is_verified_purchase  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- One review per customer per product (NULL user_ids remain distinct).
  unique (user_id, product_id)
);

create index if not exists product_reviews_product_idx on public.product_reviews (product_id);
create index if not exists product_reviews_home_idx
  on public.product_reviews (status, is_verified_purchase, rating desc, created_at desc);
create index if not exists product_reviews_status_idx on public.product_reviews (status);

alter table public.product_reviews enable row level security;

-- Public: approved reviews only (homepage + product pages).
create policy "product_reviews_select_approved"
  on public.product_reviews for select to anon, authenticated
  using (status = 'approved');

-- Customers: read their own reviews in any status (needed to show
-- "awaiting approval" / "already reviewed" states). Strictly own rows only.
create policy "product_reviews_select_own"
  on public.product_reviews for select to authenticated
  using (user_id = auth.uid());

-- Admins: see all reviews (including pending/rejected) for moderation.
create policy "product_reviews_select_admin"
  on public.product_reviews for select to authenticated
  using (public.is_admin());

-- Customers: submit a review for themselves. The with-check pins user_id to
-- the caller AND forbids self-claiming verified purchase status.
create policy "product_reviews_insert_own"
  on public.product_reviews for insert to authenticated
  with check (user_id = auth.uid() and is_verified_purchase = false);

-- Customers: edit their own review while it is still pending. The with-check
-- keeps status pinned to 'pending' and is_verified_purchase pinned to false,
-- so a customer can never self-approve or self-claim verified status.
create policy "product_reviews_update_own"
  on public.product_reviews for update to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'pending' and is_verified_purchase = false);

create policy "product_reviews_delete_own"
  on public.product_reviews for delete to authenticated
  using (user_id = auth.uid());

-- Admins: approve / reject / remove reviews.
create policy "product_reviews_update_admin"
  on public.product_reviews for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "product_reviews_delete_admin"
  on public.product_reviews for delete to authenticated
  using (public.is_admin());

revoke all on public.product_reviews from anon;
grant select on public.product_reviews to anon;
grant select, insert, update, delete on public.product_reviews to authenticated;
