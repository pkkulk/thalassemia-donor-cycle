-- Optional DB-level safety guards for donor-patient links
-- Run this in Supabase SQL Editor after patient_donor_links.sql

create or replace function public.can_donate_abo_rh(
  donor_blood_group text,
  patient_blood_group text
)
returns boolean
language plpgsql
immutable
as $$
declare
  donor_abo text;
  donor_rh text;
  patient_abo text;
  patient_rh text;
begin
  if donor_blood_group is null or patient_blood_group is null then
    return false;
  end if;

  donor_blood_group := upper(trim(donor_blood_group));
  patient_blood_group := upper(trim(patient_blood_group));

  if donor_blood_group !~ '^(AB|A|B|O)[+-]$' then
    return false;
  end if;

  if patient_blood_group !~ '^(AB|A|B|O)[+-]$' then
    return false;
  end if;

  donor_abo := regexp_replace(donor_blood_group, '([+-])$', '');
  donor_rh := right(donor_blood_group, 1);
  patient_abo := regexp_replace(patient_blood_group, '([+-])$', '');
  patient_rh := right(patient_blood_group, 1);

  if donor_abo = 'O' then
    null;
  elsif donor_abo = 'A' and patient_abo not in ('A', 'AB') then
    return false;
  elsif donor_abo = 'B' and patient_abo not in ('B', 'AB') then
    return false;
  elsif donor_abo = 'AB' and patient_abo <> 'AB' then
    return false;
  end if;

  if donor_rh = '+' and patient_rh <> '+' then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.enforce_patient_donor_link_rules()
returns trigger
language plpgsql
as $$
declare
  donor_bg text;
  patient_bg text;
begin
  -- Only enforce baseline blood-group compatibility when a link is approved.
  if new.status = 'approved' then
    select d.blood_group into donor_bg
    from public.donor d
    where d.id = new.donor_id;

    select p.blood_group into patient_bg
    from public.patients p
    where p.id = new.patient_id;

    if donor_bg is null then
      raise exception 'Cannot approve link: donor % not found or missing blood group', new.donor_id;
    end if;

    if patient_bg is null then
      raise exception 'Cannot approve link: patient % not found or missing blood group', new.patient_id;
    end if;

    if not public.can_donate_abo_rh(donor_bg, patient_bg) then
      raise exception 'Cannot approve incompatible link: donor % (%) -> patient % (%)',
        new.donor_id, donor_bg, new.patient_id, patient_bg;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_patient_donor_links_rules on public.patient_donor_links;
create trigger trg_patient_donor_links_rules
before insert or update on public.patient_donor_links
for each row
execute function public.enforce_patient_donor_link_rules();
