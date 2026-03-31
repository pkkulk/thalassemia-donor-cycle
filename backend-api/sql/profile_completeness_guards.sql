-- Profile completeness guards for critical appointment operations
-- Run this in Supabase SQL Editor

-- Completeness helpers
create or replace function public.is_patient_profile_complete(p_patient_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.patients p
    where p.id = p_patient_id
      and nullif(btrim(coalesce(p.name, '')), '') is not null
      and nullif(btrim(coalesce(p.email, '')), '') is not null
      and nullif(btrim(coalesce(p.blood_group, '')), '') is not null
      and nullif(btrim(coalesce(p.phone, '')), '') is not null
  );
$$;

create or replace function public.is_donor_profile_complete(p_donor_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.donor d
    where d.id = p_donor_id
      and nullif(btrim(coalesce(d.name, '')), '') is not null
      and nullif(btrim(coalesce(d.email, '')), '') is not null
      and nullif(btrim(coalesce(d.blood_group, '')), '') is not null
      and nullif(btrim(coalesce(d.phone, '')), '') is not null
  );
$$;

-- Trigger guard: enforce completeness before critical actions
create or replace function public.guard_appointment_profile_completeness()
returns trigger
language plpgsql
as $$
begin
  -- Booking / creation requires patient profile completeness
  if tg_op = 'INSERT' then
    if new.patient_id is null then
      raise exception 'Cannot create appointment without patient_id';
    end if;

    if not public.is_patient_profile_complete(new.patient_id) then
      raise exception 'Patient profile incomplete: name, email, blood_group, and phone are required';
    end if;

    -- If donor is assigned at creation, donor profile must be complete too
    if new.donor_id is not null and not public.is_donor_profile_complete(new.donor_id) then
      raise exception 'Donor profile incomplete: name, email, blood_group, and phone are required';
    end if;

    return new;
  end if;

  -- Re-check on updates that affect critical workflow fields
  if new.patient_id is not null and (
    old.patient_id is distinct from new.patient_id
    or old.status is distinct from new.status
  ) then
    if not public.is_patient_profile_complete(new.patient_id) then
      raise exception 'Patient profile incomplete: name, email, blood_group, and phone are required';
    end if;
  end if;

  -- Donor assignment / donor-action statuses require donor profile completeness
  if new.donor_id is not null and (
    old.donor_id is distinct from new.donor_id
    or old.status is distinct from new.status
    or new.status in ('Accepted', 'Donated', 'Completed')
  ) then
    if not public.is_donor_profile_complete(new.donor_id) then
      raise exception 'Donor profile incomplete: name, email, blood_group, and phone are required';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_appointment_profile_completeness on public.appointments;

create trigger trg_guard_appointment_profile_completeness
before insert or update on public.appointments
for each row
execute function public.guard_appointment_profile_completeness();
