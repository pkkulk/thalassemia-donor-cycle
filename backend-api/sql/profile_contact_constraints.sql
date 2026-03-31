-- Profile contact constraints
-- Enforces:
-- 1) phone must be exactly 10 digits (no +91)
-- 2) email must follow basic email format
--
-- Run this in Supabase SQL Editor AFTER validating existing rows.

-- Normalize existing values first (safe cleanup)
UPDATE public.donor
SET
  blood_group = UPPER(TRIM(COALESCE(blood_group, ''))),
  phone = CASE
    WHEN regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') ~ '^91[0-9]{10}$'
      THEN RIGHT(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), 10)
    ELSE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g')
  END,
  email = LOWER(TRIM(email));

UPDATE public.patients
SET
  blood_group = UPPER(TRIM(COALESCE(blood_group, ''))),
  phone = CASE
    WHEN regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') ~ '^91[0-9]{10}$'
      THEN RIGHT(regexp_replace(COALESCE(phone, ''), '\\D', '', 'g'), 10)
    ELSE regexp_replace(COALESCE(phone, ''), '\\D', '', 'g')
  END,
  email = LOWER(TRIM(email));

-- Add constraints for donor
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_donor_phone_10_digits'
  ) THEN
    ALTER TABLE public.donor DROP CONSTRAINT chk_donor_phone_10_digits;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_donor_email_format'
  ) THEN
    ALTER TABLE public.donor DROP CONSTRAINT chk_donor_email_format;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_donor_blood_group_valid'
  ) THEN
    ALTER TABLE public.donor DROP CONSTRAINT chk_donor_blood_group_valid;
  END IF;

  ALTER TABLE public.donor
    ADD CONSTRAINT chk_donor_phone_10_digits
    CHECK (phone ~ '^[0-9]{10}$');

  ALTER TABLE public.donor
    ADD CONSTRAINT chk_donor_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

  ALTER TABLE public.donor
    ADD CONSTRAINT chk_donor_blood_group_valid
    CHECK (blood_group ~ '^(AB|A|B|O)[+-]$');
END $$;

-- Add constraints for patients
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_patients_phone_10_digits'
  ) THEN
    ALTER TABLE public.patients DROP CONSTRAINT chk_patients_phone_10_digits;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_patients_email_format'
  ) THEN
    ALTER TABLE public.patients DROP CONSTRAINT chk_patients_email_format;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_patients_blood_group_valid'
  ) THEN
    ALTER TABLE public.patients DROP CONSTRAINT chk_patients_blood_group_valid;
  END IF;

  ALTER TABLE public.patients
    ADD CONSTRAINT chk_patients_phone_10_digits
    CHECK (phone ~ '^[0-9]{10}$');

  ALTER TABLE public.patients
    ADD CONSTRAINT chk_patients_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

  ALTER TABLE public.patients
    ADD CONSTRAINT chk_patients_blood_group_valid
    CHECK (blood_group ~ '^(AB|A|B|O)[+-]$');
END $$;

-- Enforce uniqueness in each table (case-insensitive email + exact phone digits)
CREATE UNIQUE INDEX IF NOT EXISTS uq_donor_email_lower
  ON public.donor (LOWER(TRIM(email)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_email_lower
  ON public.patients (LOWER(TRIM(email)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_donor_phone
  ON public.donor (phone);

CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_phone
  ON public.patients (phone);

-- Enforce no duplicate contact identity across donor and patients tables.
CREATE OR REPLACE FUNCTION public.enforce_cross_profile_contact_uniqueness()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.email := LOWER(TRIM(COALESCE(NEW.email, '')));
  NEW.phone := regexp_replace(COALESCE(NEW.phone, ''), '\\D', '', 'g');

  IF TG_TABLE_NAME = 'donor' THEN
    IF EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE LOWER(TRIM(COALESCE(p.email, ''))) = NEW.email
    ) THEN
      RAISE EXCEPTION 'email already exists in patients'
        USING ERRCODE = '23505', CONSTRAINT = 'uq_cross_profile_email';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.patients p
      WHERE regexp_replace(COALESCE(p.phone, ''), '\\D', '', 'g') = NEW.phone
    ) THEN
      RAISE EXCEPTION 'phone already exists in patients'
        USING ERRCODE = '23505', CONSTRAINT = 'uq_cross_profile_phone';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1
      FROM public.donor d
      WHERE LOWER(TRIM(COALESCE(d.email, ''))) = NEW.email
    ) THEN
      RAISE EXCEPTION 'email already exists in donor'
        USING ERRCODE = '23505', CONSTRAINT = 'uq_cross_profile_email';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.donor d
      WHERE regexp_replace(COALESCE(d.phone, ''), '\\D', '', 'g') = NEW.phone
    ) THEN
      RAISE EXCEPTION 'phone already exists in donor'
        USING ERRCODE = '23505', CONSTRAINT = 'uq_cross_profile_phone';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_donor_cross_profile_contact_uniqueness ON public.donor;
CREATE TRIGGER trg_donor_cross_profile_contact_uniqueness
BEFORE INSERT OR UPDATE OF email, phone ON public.donor
FOR EACH ROW
EXECUTE FUNCTION public.enforce_cross_profile_contact_uniqueness();

DROP TRIGGER IF EXISTS trg_patients_cross_profile_contact_uniqueness ON public.patients;
CREATE TRIGGER trg_patients_cross_profile_contact_uniqueness
BEFORE INSERT OR UPDATE OF email, phone ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.enforce_cross_profile_contact_uniqueness();
