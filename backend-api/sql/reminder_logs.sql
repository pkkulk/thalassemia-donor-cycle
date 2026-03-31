-- Tier 1 reminder dedupe log table
-- Run this in Supabase SQL Editor

create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  recipient_role text not null check (recipient_role in ('patient', 'donor')),
  recipient_id uuid,
  recipient_email text,
  reminder_type text not null check (reminder_type in ('DAY_BEFORE', 'SAME_DAY')),
  appointment_date date not null,
  sent_at timestamptz not null default now(),
  provider text default 'resend',
  provider_message_id text,
  payload jsonb,
  unique (appointment_id, recipient_role, reminder_type)
);

create index if not exists idx_reminder_logs_sent_at
  on public.reminder_logs(sent_at desc);

create index if not exists idx_reminder_logs_appointment
  on public.reminder_logs(appointment_id);
