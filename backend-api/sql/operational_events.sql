-- Operational events for lightweight monitoring (Health panel)
-- Run this in Supabase SQL Editor

create table if not exists public.operational_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_operational_events_event_type_created_at
  on public.operational_events(event_type, created_at desc);

create index if not exists idx_operational_events_created_at
  on public.operational_events(created_at desc);
