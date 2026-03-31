-- Donor-Patient dedicated pool mapping for thalassemia workflow
-- Run this in Supabase SQL Editor

create table if not exists public.patient_donor_links (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  donor_id uuid not null references public.donor(id) on delete cascade,
  status text not null default 'approved' check (status in ('approved', 'inactive', 'pending')),
  notes text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, donor_id)
);

create index if not exists idx_patient_donor_links_patient_id
  on public.patient_donor_links(patient_id);

create index if not exists idx_patient_donor_links_donor_id
  on public.patient_donor_links(donor_id);

create index if not exists idx_patient_donor_links_status
  on public.patient_donor_links(status);

create or replace function public.set_updated_at_patient_donor_links()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_patient_donor_links_updated_at on public.patient_donor_links;
create trigger trg_patient_donor_links_updated_at
before update on public.patient_donor_links
for each row
execute function public.set_updated_at_patient_donor_links();
