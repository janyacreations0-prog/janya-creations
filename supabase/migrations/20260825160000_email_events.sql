-- ============================================================================
-- Janya Creations — Phase 6: Transactional email event log
-- Migration 0010
--
-- Lightweight email-event ledger used for:
--   - idempotent transactional emails (no duplicate sends on duplicate webhook
--     callbacks / repeated status submissions)
--   - abandoned-cart reminder deduplication
--   - admin visibility of email delivery status
--
-- No customer can read/write these records; only trusted server-side
-- operations (service-role email service, admin reads) can access them.
-- ============================================================================

create table if not exists public.order_email_events (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid references public.orders (id) on delete cascade,
  cart_id              uuid references public.carts (id) on delete set null,
  user_id              uuid references auth.users (id) on delete set null,
  email                text not null,
  event_type           text not null,
  status               text not null default 'pending'
                       check (status in ('pending','sent','failed','skipped')),
  provider_message_id  text,
  attempt_count        integer not null default 0,
  last_error           text,
  created_at           timestamptz not null default now(),
  sent_at              timestamptz,
  -- Idempotency guards: at most one email per logical event per order/cart.
  unique (order_id, event_type),
  unique (cart_id, event_type)
);

create index if not exists order_email_events_order_idx on public.order_email_events (order_id);
create index if not exists order_email_events_cart_idx on public.order_email_events (cart_id);
create index if not exists order_email_events_status_idx on public.order_email_events (status);

alter table public.order_email_events enable row level security;

-- Admins may inspect email history; customers/anon have no access.
create policy "order_email_events_select_admin"
  on public.order_email_events for select to authenticated
  using (public.is_admin());

revoke all on public.order_email_events from anon, authenticated;
grant select on public.order_email_events to authenticated;
