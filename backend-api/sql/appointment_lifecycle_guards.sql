-- Appointment lifecycle guards + transition timestamps
-- Run this in Supabase SQL Editor

-- 1) Add lifecycle timestamps (idempotent)
alter table public.appointments
  add column if not exists requested_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists completed_at timestamptz;

-- Backfill requested_at for existing records using created_at when available
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'appointments'
      and column_name = 'created_at'
  ) then
    execute $q$
      update public.appointments
      set requested_at = coalesce(requested_at, created_at, now())
      where requested_at is null
    $q$;
  else
    update public.appointments
    set requested_at = coalesce(requested_at, now())
    where requested_at is null;
  end if;
end
$$;

-- Ensure new rows default to Scheduled if status is missing
alter table public.appointments
  alter column status set default 'Scheduled';

-- 2) Validate status transitions + stamp lifecycle timestamps
create or replace function public.guard_appointment_lifecycle()
returns trigger
language plpgsql
as $$
declare
  old_status text;
  new_status text;
begin
  if tg_op = 'INSERT' then
    if new.patient_id is null then
      raise exception 'Patient is required for appointment creation';
    end if;

    if not exists (
      select 1
      from public.patient_donor_links pdl
      where pdl.patient_id = new.patient_id
        and pdl.status = 'approved'
    ) then
      raise exception 'Cannot create appointment: no approved donor pool mapped for patient %', new.patient_id;
    end if;

    if new.status is null then
      new.status := 'Scheduled';
    end if;

    if new.status not in ('Scheduled', 'Accepted', 'Declined', 'Donated', 'Completed') then
      raise exception 'Invalid appointment status on insert: %', new.status;
    end if;

    new.requested_at := coalesce(new.requested_at, now());

    if new.status = 'Accepted' then
      new.accepted_at := coalesce(new.accepted_at, now());
    elsif new.status = 'Declined' then
      new.declined_at := coalesce(new.declined_at, now());
    elsif new.status = 'Donated' then
      new.accepted_at := coalesce(new.accepted_at, now());
      new.donor_completed_at := coalesce(new.donor_completed_at, now());
    elsif new.status = 'Completed' then
      new.accepted_at := coalesce(new.accepted_at, now());
      new.donor_completed_at := coalesce(new.donor_completed_at, now());
      new.patient_completed_at := coalesce(new.patient_completed_at, now());
      new.completed_at := coalesce(new.completed_at, now());
    end if;

    return new;
  end if;

  old_status := coalesce(old.status, 'Scheduled');
  new_status := coalesce(new.status, old_status);

  if coalesce(new.patient_id, old.patient_id) is null then
    raise exception 'Patient is required for appointments';
  end if;

  if new.patient_id is distinct from old.patient_id then
    if not exists (
      select 1
      from public.patient_donor_links pdl
      where pdl.patient_id = new.patient_id
        and pdl.status = 'approved'
    ) then
      raise exception 'Cannot move appointment to patient %: no approved donor pool mapped', new.patient_id;
    end if;
  end if;

  if new_status not in ('Scheduled', 'Accepted', 'Declined', 'Donated', 'Completed') then
    raise exception 'Invalid appointment status: %', new_status;
  end if;

  -- No status change: allow update, but keep lifecycle timestamps safe.
  if new_status = old_status then
    if new_status = 'Donated' then
      new.donor_completed_at := coalesce(new.donor_completed_at, old.donor_completed_at, now());
    elsif new_status = 'Completed' then
      new.donor_completed_at := coalesce(new.donor_completed_at, old.donor_completed_at, now());
      new.patient_completed_at := coalesce(new.patient_completed_at, old.patient_completed_at, now());
      new.completed_at := coalesce(new.completed_at, old.completed_at, now());
    end if;
    return new;
  end if;

  -- Allowed transitions:
  -- Scheduled -> Accepted | Declined
  -- Accepted  -> Donated  | Declined
  -- Donated   -> Completed
  -- Declined/Completed are terminal
  if not (
    (old_status = 'Scheduled' and new_status in ('Accepted', 'Declined')) or
    (old_status = 'Accepted' and new_status in ('Donated', 'Declined')) or
    (old_status = 'Donated' and new_status = 'Completed')
  ) then
    raise exception 'Invalid appointment status transition: % -> %', old_status, new_status;
  end if;

  -- Transition timestamps
  if new_status = 'Accepted' then
    new.accepted_at := coalesce(new.accepted_at, old.accepted_at, now());
  elsif new_status = 'Declined' then
    new.declined_at := coalesce(new.declined_at, old.declined_at, now());
  elsif new_status = 'Donated' then
    new.donor_completed_at := coalesce(new.donor_completed_at, old.donor_completed_at, now());
  elsif new_status = 'Completed' then
    new.patient_completed_at := coalesce(new.patient_completed_at, old.patient_completed_at, now());
    new.completed_at := coalesce(new.completed_at, old.completed_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_appointment_lifecycle on public.appointments;

create trigger trg_guard_appointment_lifecycle
before insert or update on public.appointments
for each row
execute function public.guard_appointment_lifecycle();
