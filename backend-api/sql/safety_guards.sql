-- Tier 1 safety guards (donation interval + consent baseline)
-- Run this in Supabase SQL Editor

-- 1) Consent baseline columns (backward-compatible)
alter table public.donor
  add column if not exists consent_to_donate boolean;

alter table public.patients
  add column if not exists consent_for_transfusion boolean;

-- Keep existing users unblocked for now; new policy can later flip defaults to false
update public.donor
set consent_to_donate = true
where consent_to_donate is null;

update public.patients
set consent_for_transfusion = true
where consent_for_transfusion is null;

alter table public.donor
  alter column consent_to_donate set default true,
  alter column consent_to_donate set not null;

alter table public.patients
  alter column consent_for_transfusion set default true,
  alter column consent_for_transfusion set not null;

-- 2) Donor safety checks for critical status transitions
create or replace function public.guard_appointment_safety_rules()
returns trigger
language plpgsql
as $$
declare
  donor_last_donated date;
  donor_available boolean;
  donor_next_available date;
  donor_consented boolean;
  patient_consented boolean;
  effective_service_date date;
begin
  -- We only enforce hard safety on critical donor workflow statuses.
  if new.status not in ('Accepted', 'Donated', 'Completed') then
    return new;
  end if;

  if new.donor_id is null then
    raise exception 'Safety guard: donor_id is required for status %', new.status;
  end if;

  -- Determine relevant service date.
  effective_service_date := coalesce(new.donor_arrival::date, new.date::date, current_date);

  select d.last_donated::date,
         coalesce(d.available, true),
         d.next_available_date::date,
         coalesce(d.consent_to_donate, false)
    into donor_last_donated, donor_available, donor_next_available, donor_consented
  from public.donor d
  where d.id = new.donor_id;

  if not found then
    raise exception 'Safety guard: donor % not found', new.donor_id;
  end if;

  select coalesce(p.consent_for_transfusion, false)
    into patient_consented
  from public.patients p
  where p.id = new.patient_id;

  if not found then
    raise exception 'Safety guard: patient % not found', new.patient_id;
  end if;

  if not donor_consented then
    raise exception 'Safety guard: donor consent is required';
  end if;

  if not patient_consented then
    raise exception 'Safety guard: patient transfusion consent is required';
  end if;

  -- Donor must be currently available before Accepting/Donated/Completed workflows.
  if donor_available = false then
    raise exception 'Safety guard: donor is currently unavailable';
  end if;

  -- next_available_date, if present, must be on/before planned service date.
  if donor_next_available is not null and donor_next_available > effective_service_date then
    raise exception
      'Safety guard: donor next available on %, cannot serve on %',
      donor_next_available,
      effective_service_date;
  end if;

  -- Enforce minimum 90-day interval from last donation.
  if donor_last_donated is not null and donor_last_donated > (effective_service_date - interval '90 day')::date then
    raise exception
      'Safety guard: minimum 90-day interval not met (last donated on %)',
      donor_last_donated;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_appointment_safety_rules on public.appointments;

create trigger trg_guard_appointment_safety_rules
before insert or update on public.appointments
for each row
execute function public.guard_appointment_safety_rules();
