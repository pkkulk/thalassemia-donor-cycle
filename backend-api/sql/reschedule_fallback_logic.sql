-- Tier 2: Feature 2 - Reschedule & Fallback Flow
-- Purpose: Auto-suggest alternate donors when a donor declines or misses appointment
-- Date: 2026-03-29

-- ============================================
-- 1. ADD RESCHEDULE METADATA TO APPOINTMENTS
-- ============================================
-- appointments.id is BIGINT in this schema, so original_appointment_id must also be BIGINT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'appointments'
      AND column_name = 'original_appointment_id'
      AND data_type = 'uuid'
  ) THEN
    -- Previous failed attempts may have created UUID type. Convert safely for empty/NULL values.
    ALTER TABLE appointments
    ALTER COLUMN original_appointment_id TYPE BIGINT USING NULL;
  END IF;
END $$;

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS original_appointment_id BIGINT,
ADD COLUMN IF NOT EXISTS reschedule_reason TEXT, -- 'donor_declined', 'no_show', 'patient_requested', 'admin_reassign'
ADD COLUMN IF NOT EXISTS reschedule_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_fallback_suggested_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_original_appointment_id_fkey'
  ) THEN
    ALTER TABLE appointments
    ADD CONSTRAINT appointments_original_appointment_id_fkey
    FOREIGN KEY (original_appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 2. CREATE FALLBACK SUGGESTION LOG
-- ============================================
-- Tracks all fallback suggestions for audit trail
CREATE TABLE IF NOT EXISTS fallback_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_appointment_id BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  suggested_donor_id UUID REFERENCES donor(id) ON DELETE SET NULL,
  suggested_date DATE NOT NULL,
  donor_rank INT,
  donor_composite_score DECIMAL(5, 2),
  suggestion_reason TEXT, -- 'top_ranked', 'compatible_available', 'fallback_linked'
  donor_accepted BOOLEAN DEFAULT NULL, -- NULL = not yet responded, true/false = response
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_suggestion_reason CHECK (
    suggestion_reason IN ('top_ranked', 'compatible_available', 'fallback_linked')
  )
);

CREATE INDEX IF NOT EXISTS idx_fallback_original_appt ON fallback_suggestions(original_appointment_id);
CREATE INDEX IF NOT EXISTS idx_fallback_donor ON fallback_suggestions(suggested_donor_id);
CREATE INDEX IF NOT EXISTS idx_fallback_created ON fallback_suggestions(created_at DESC);

-- ============================================
-- 3. FUNCTION: GET FALLBACK SUGGESTIONS
-- ============================================
-- Returns top 3 ranked donors + top 3 alternative dates for rescheduling
CREATE OR REPLACE FUNCTION get_fallback_suggestions(
  p_original_appointment_id BIGINT,
  p_max_donors INT DEFAULT 3,
  p_max_dates INT DEFAULT 3
)
RETURNS TABLE(
  fallback_type VARCHAR,
  fallback_value VARCHAR,
  priority INT,
  recommendation_reason TEXT
) AS $$
DECLARE
  v_patient_id UUID;
  v_original_date DATE;
  v_donor_count INT := 0;
  v_date_count INT := 0;
  donor_rec RECORD;
  date_rec RECORD;
BEGIN
  -- Fetch original appointment details
  SELECT patient_id, date
  INTO v_patient_id, v_original_date
  FROM appointments
  WHERE id = p_original_appointment_id;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'Appointment not found: %', p_original_appointment_id;
  END IF;

  -- 1. SUGGEST TOP RANKED DONORS (from same patient-donor links)
  FOR donor_rec IN
    SELECT 
      d.id::TEXT,
      d.name,
      rs.composite_score,
      rs.donor_rank,
      CASE 
        WHEN rs.composite_score >= 80 THEN 'top_ranked'
        WHEN rs.composite_score >= 60 THEN 'compatible_available'
        ELSE 'fallback_linked'
      END as suggestion_reason
    FROM patient_donor_links pdl
    JOIN donor d ON pdl.donor_id = d.id
    LEFT JOIN LATERAL (
      SELECT *
      FROM donor_ranking_scores
      WHERE donor_id = d.id
      ORDER BY calculated_at DESC
      LIMIT 1
    ) rs ON TRUE
    WHERE pdl.patient_id = v_patient_id
      AND pdl.status = 'approved'
      AND d.available = TRUE
      AND d.id NOT IN (
        SELECT donor_id FROM appointments 
        WHERE id = p_original_appointment_id
      )
    ORDER BY rs.composite_score DESC NULLS LAST
    LIMIT p_max_donors
  LOOP
    v_donor_count := v_donor_count + 1;
    RETURN QUERY SELECT
      'donor',
      donor_rec.name,
      v_donor_count,
      'Ranked donor - Score: ' || COALESCE(donor_rec.composite_score::TEXT, 'N/A');
  END LOOP;

  -- 2. SUGGEST ALTERNATIVE DATES (next 3 open slots)
  FOR date_rec IN
    SELECT DISTINCT a.date::TEXT
    FROM appointments a
    WHERE a.patient_id = v_patient_id
      AND a.date > v_original_date
      AND a.status = 'Scheduled'
    ORDER BY a.date ASC
    LIMIT p_max_dates
  LOOP
    v_date_count := v_date_count + 1;
    RETURN QUERY SELECT
      'date',
      date_rec.date,
      v_date_count,
      'Alternative appointment slot available';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. FUNCTION: CREATE FALLBACK APPOINTMENT
-- ============================================
-- Creates new appointment from original + links it via reschedule tracking
CREATE OR REPLACE FUNCTION create_fallback_appointment(
  p_original_appointment_id BIGINT,
  p_fallback_date DATE,
  p_suggested_donor_id UUID,
  p_reason TEXT
)
RETURNS BIGINT AS $$
DECLARE
  v_original_appt RECORD;
  v_new_appointment_id BIGINT;
  v_donor_rank INT;
  v_composite_score DECIMAL(5, 2);
BEGIN
  -- Fetch original appointment
  SELECT id, patient_id, reschedule_count
  INTO v_original_appt
  FROM appointments
  WHERE id = p_original_appointment_id;

  IF v_original_appt IS NULL THEN
    RAISE EXCEPTION 'Original appointment not found: %', p_original_appointment_id;
  END IF;

  -- Fetch suggested donor's ranking
  SELECT rs.donor_rank, rs.composite_score
  INTO v_donor_rank, v_composite_score
  FROM donor_ranking_scores rs
  WHERE rs.donor_id = p_suggested_donor_id
  ORDER BY rs.calculated_at DESC
  LIMIT 1;

  -- Create new appointment (fallback)
  INSERT INTO appointments (
    patient_id,
    date,
    donor_id,
    status,
    original_appointment_id,
    reschedule_reason,
    reschedule_count
  )
  VALUES (
    v_original_appt.patient_id,
    p_fallback_date,
    p_suggested_donor_id,
    'Scheduled',
    p_original_appointment_id,
    p_reason,
    v_original_appt.reschedule_count + 1
  )
  RETURNING appointments.id INTO v_new_appointment_id;

  -- Log fallback suggestion
  INSERT INTO fallback_suggestions (
    original_appointment_id,
    suggested_donor_id,
    suggested_date,
    donor_rank,
    donor_composite_score,
    suggestion_reason
  )
  VALUES (
    p_original_appointment_id,
    p_suggested_donor_id,
    p_fallback_date,
    v_donor_rank,
    v_composite_score,
    CASE 
      WHEN v_composite_score IS NULL THEN 'fallback_linked'
      WHEN v_composite_score >= 80 THEN 'top_ranked'
      WHEN v_composite_score >= 60 THEN 'compatible_available'
      ELSE 'fallback_linked'
    END
  );

  -- Update original appointment with reschedule tracking
  UPDATE appointments
  SET last_fallback_suggested_at = NOW()
  WHERE id = p_original_appointment_id;

  RETURN v_new_appointment_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. FUNCTION: MARK FALLBACK ACCEPTED
-- ============================================
-- Marks fallback suggestion as accepted when donor confirms new appointment
CREATE OR REPLACE FUNCTION mark_fallback_accepted(
  p_fallback_appointment_id BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_original_id BIGINT;
BEGIN
  -- Find original appointment ID
  SELECT original_appointment_id
  INTO v_original_id
  FROM appointments
  WHERE id = p_fallback_appointment_id;

  IF v_original_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Mark fallback suggestion as accepted
  UPDATE fallback_suggestions
  SET 
    donor_accepted = TRUE,
    accepted_at = NOW()
  WHERE original_appointment_id = v_original_id
    AND suggested_date = (SELECT date FROM appointments WHERE id = p_fallback_appointment_id)
    AND suggested_donor_id = (SELECT donor_id FROM appointments WHERE id = p_fallback_appointment_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. HELPER VIEW: PENDING RESCHEDULING
-- ============================================
-- Shows appointments that need fallback suggestions
CREATE OR REPLACE VIEW vw_pending_rescheduling AS
SELECT
  a.id,
  a.patient_id,
  a.date,
  p.blood_group,
  a.donor_id,
  a.status,
  a.reschedule_reason,
  a.reschedule_count,
  d.name as current_donor_name,
  COUNT(fs.id) as fallback_count,
  MAX(a.last_fallback_suggested_at) as last_suggested
FROM appointments a
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN donor d ON a.donor_id = d.id
LEFT JOIN fallback_suggestions fs ON a.id = fs.original_appointment_id
WHERE (a.status = 'Declined' OR a.status = 'NoShow')
  AND a.reschedule_count < 3 -- Prevent infinite rescheduling
GROUP BY a.id, a.patient_id, a.date, p.blood_group, a.donor_id, a.status, a.reschedule_reason, a.reschedule_count, d.name
ORDER BY a.date DESC;

-- ============================================
-- 7. COMMENTS & DOCUMENTATION
-- ============================================
COMMENT ON TABLE fallback_suggestions IS 'Audit trail of fallback donor/date suggestions for declined or missed appointments';
COMMENT ON COLUMN appointments.original_appointment_id IS 'References the original appointment if this is a rescheduled fallback';
COMMENT ON COLUMN appointments.reschedule_reason IS 'Reason for rescheduling: donor_declined, no_show, patient_requested, admin_reassign';
COMMENT ON COLUMN appointments.reschedule_count IS 'Number of times this patient-date combo has been rescheduled (max 3)';
COMMENT ON FUNCTION get_fallback_suggestions IS 'Returns top donor suggestions + alternative dates for rescheduling a declined/missed appointment';
COMMENT ON FUNCTION create_fallback_appointment IS 'Creates new fallback appointment linked to original, logs suggestion';
COMMENT ON FUNCTION mark_fallback_accepted IS 'Marks fallback as accepted when donor confirms new appointment status';
COMMENT ON VIEW vw_pending_rescheduling IS 'Shows appointments needing rescheduling (declined/no-show) with fallback metrics';
