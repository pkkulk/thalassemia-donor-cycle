-- Tier 2: Feature 1 - Donor Ranking Logic
-- Purpose: Score donors by reliability, distance, and activity for intelligent matching
-- Date: 2026-03-29

-- ============================================
-- 1. ADD SCORING COLUMNS TO DONOR TABLE
-- ============================================
ALTER TABLE donor
ADD COLUMN IF NOT EXISTS response_rate DECIMAL(5, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS distance_km DECIMAL(6, 2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recent_activity_days INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cancellation_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_donations INT DEFAULT 0;

-- ============================================
-- 2. CREATE DONOR RANKING SCORES TABLE
-- ============================================
-- Immutable audit trail of all ranking calculations
CREATE TABLE IF NOT EXISTS donor_ranking_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donor(id) ON DELETE CASCADE,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  response_rate DECIMAL(5, 2) NOT NULL,
  reliability_score DECIMAL(5, 2) NOT NULL,
  distance_score DECIMAL(5, 2) NOT NULL,
  recency_score DECIMAL(5, 2) NOT NULL,
  composite_score DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ranking_scores_donor_date ON donor_ranking_scores(donor_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ranking_scores_composite ON donor_ranking_scores(composite_score DESC, calculated_at DESC);

-- ============================================
-- 3. FUNCTION: CALCULATE RESPONSE RATE
-- ============================================
-- Response Rate = (accepted_count / total_requests) * 100
-- Counts from appointments where donor was offered (donor_id is set)
CREATE OR REPLACE FUNCTION calc_donor_response_rate(p_donor_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total_requests INT;
  v_accepted_count INT;
  v_response_rate DECIMAL(5, 2);
BEGIN
  -- Total appointments where this donor was assigned/requested
  SELECT COUNT(*) INTO v_total_requests
  FROM appointments
  WHERE donor_id = p_donor_id;

  -- Accepted appointments (status = 'Accepted' or progressed beyond)
  SELECT COUNT(*) INTO v_accepted_count
  FROM appointments
  WHERE donor_id = p_donor_id
    AND status IN ('Accepted', 'Donated', 'Completed');

  -- Avoid division by zero
  IF v_total_requests = 0 THEN
    v_response_rate := 0.0;
  ELSE
    v_response_rate := ROUND(
      (v_accepted_count::DECIMAL / v_total_requests::DECIMAL) * 100, 2
    )::DECIMAL(5, 2);
  END IF;

  RETURN v_response_rate;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 4. FUNCTION: CALCULATE COMPOSITE RANKING SCORE
-- ============================================
-- Weighted composite score:
--  - Response Reliability: 40% (acceptance rate)
--  - Distance: 30% (inverse normalized)
--  - Recency: 20% (days since last donation)
--  - Cancellation Penalty: -10 per recent cancel
--  - Completed Donations Bonus: +5 per 5 donations
CREATE OR REPLACE FUNCTION calc_donor_composite_score(
  p_response_rate DECIMAL,
  p_distance_km DECIMAL,
  p_recent_activity_days INT,
  p_cancellation_count INT,
  p_completed_donations INT
)
RETURNS DECIMAL AS $$
DECLARE
  v_reliability_score DECIMAL(5, 2);
  v_distance_score DECIMAL(5, 2);
  v_recency_score DECIMAL(5, 2);
  v_cancel_penalty DECIMAL(5, 2);
  v_completion_bonus DECIMAL(5, 2);
  v_composite_score DECIMAL(5, 2);
BEGIN
  -- 1. Reliability Score (40% weight): Use response_rate directly (0-100)
  v_reliability_score := COALESCE(p_response_rate, 0.0) * 0.40;

  -- 2. Distance Score (30% weight): Inverse normalize (closer = higher)
  -- Formula: (1 / distance_km) * 100, capped at 100
  -- If no distance, assume worst case (100 km reference)
  IF p_distance_km IS NULL OR p_distance_km <= 0 THEN
    v_distance_score := 50.0 * 0.30; -- Neutral middle score
  ELSE
    v_distance_score := LEAST((100.0 / p_distance_km) * 100, 100.0) * 0.30;
  END IF;

  -- 3. Recency Score (20% weight): Normalize days since last donation
  -- Ideal: 0-30 days = 100, 31-60 = 80, 61+ = 50
  -- NULL (never donated) = 50 (neutral)
  IF p_recent_activity_days IS NULL THEN
    v_recency_score := 50.0 * 0.20;
  ELSIF p_recent_activity_days <= 30 THEN
    v_recency_score := 100.0 * 0.20;
  ELSIF p_recent_activity_days <= 60 THEN
    v_recency_score := 80.0 * 0.20;
  ELSE
    v_recency_score := 50.0 * 0.20;
  END IF;

  -- 4. Cancellation Penalty: -10 per cancellation (max -50)
  v_cancel_penalty := GREATEST(-50.0, -1.0 * p_cancellation_count * 10);

  -- 5. Completion Bonus: +5 per 5 completed donations (max +50)
  v_completion_bonus := LEAST(50.0, FLOOR(COALESCE(p_completed_donations, 0) / 5.0) * 5);

  -- 6. Final composite (0-100 scale)
  v_composite_score := GREATEST(0.0, LEAST(100.0,
    v_reliability_score +
    v_distance_score +
    v_recency_score +
    v_cancel_penalty +
    v_completion_bonus
  ));

  RETURN ROUND(v_composite_score, 2)::DECIMAL(5, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. FUNCTION: RECALCULATE ALL DONOR SCORES
-- ============================================
-- Called on-demand or scheduled; updates ranking_scores table
CREATE OR REPLACE FUNCTION recalculate_donor_rankings()
RETURNS TABLE(donor_id UUID, composite_score DECIMAL) AS $$
DECLARE
  v_donor_row RECORD;
  v_response_rate DECIMAL(5, 2);
  v_distance_score DECIMAL(5, 2);
  v_recency_score DECIMAL(5, 2);
  v_composite DECIMAL(5, 2);
BEGIN
  FOR v_donor_row IN SELECT id FROM donor WHERE available = TRUE LOOP
    -- Calculate response rate
    v_response_rate := calc_donor_response_rate(v_donor_row.id);

    -- Calculate composite score
    v_composite := calc_donor_composite_score(
      v_response_rate,
      (SELECT distance_km FROM donor WHERE id = v_donor_row.id),
      (SELECT EXTRACT(DAY FROM NOW() - COALESCE(last_donated, NOW()))::INT FROM donor WHERE id = v_donor_row.id),
      (SELECT cancellation_count FROM donor WHERE id = v_donor_row.id),
      (SELECT completed_donations FROM donor WHERE id = v_donor_row.id)
    );

    -- Insert into ranking scores (audit trail)
    INSERT INTO donor_ranking_scores (
      donor_id,
      response_rate,
      reliability_score,
      distance_score,
      recency_score,
      composite_score
    )
    VALUES (
      v_donor_row.id,
      v_response_rate,
      v_response_rate * 0.40,
      COALESCE((SELECT distance_km FROM donor WHERE id = v_donor_row.id), 100) * 0.30,
      (SELECT EXTRACT(DAY FROM NOW() - COALESCE(last_donated, NOW()))::INT FROM donor WHERE id = v_donor_row.id) * 0.20,
      v_composite
    );

    RETURN QUERY SELECT v_donor_row.id, v_composite;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. TRIGGER: BACKFILL INITIAL DONOR METRICS
-- ============================================
-- Initializes metrics on donor creation or profile update
CREATE OR REPLACE FUNCTION backfill_donor_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Set response_rate based on existing appointments
  NEW.response_rate := calc_donor_response_rate(NEW.id);

  -- Set recent_activity_days
  NEW.recent_activity_days := EXTRACT(DAY FROM NOW() - COALESCE(NEW.last_donated, NOW()))::INT;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_backfill_donor_metrics ON donor;
CREATE TRIGGER trg_backfill_donor_metrics
BEFORE INSERT OR UPDATE ON donor
FOR EACH ROW
EXECUTE FUNCTION backfill_donor_metrics();

-- ============================================
-- 7. BACKFILL EXISTING DONORS
-- ============================================
-- Populate metrics for donors that already exist
UPDATE donor
SET
  response_rate = COALESCE(response_rate, 0.0),
  recent_activity_days = EXTRACT(DAY FROM NOW() - COALESCE(last_donated, NOW()))::INT,
  cancellation_count = COALESCE(cancellation_count, 0),
  completed_donations = COALESCE(completed_donations, 0)
WHERE response_rate IS NULL
   OR recent_activity_days IS NULL;

-- ============================================
-- 8. HELPER VIEW: TOP RANKED DONORS
-- ============================================
-- Quick view of top 10 ranked available donors
CREATE OR REPLACE VIEW vw_top_ranked_donors AS
SELECT
  d.id,
  d.name,
  d.blood_group,
  d.distance_km,
  d.response_rate,
  d.completed_donations,
  d.cancellation_count,
  rs.composite_score,
  rs.calculated_at,
  RANK() OVER (ORDER BY rs.composite_score DESC) AS donor_rank
FROM donor d
LEFT JOIN LATERAL (
  SELECT *
  FROM donor_ranking_scores
  WHERE donor_id = d.id
  ORDER BY calculated_at DESC
  LIMIT 1
) rs ON TRUE
WHERE d.available = TRUE
ORDER BY rs.composite_score DESC NULLS LAST
LIMIT 10;

-- ============================================
-- 9. COMMENTS & DOCUMENTATION
-- ============================================
COMMENT ON TABLE donor_ranking_scores IS 'Immutable audit trail of donor ranking calculations for transparent scoring history';
COMMENT ON COLUMN donor.response_rate IS 'Percentage of accepted appointments vs total requests (0-100)';
COMMENT ON COLUMN donor.distance_km IS 'Distance from clinic in kilometers for location-based matching';
COMMENT ON COLUMN donor.recent_activity_days IS 'Days since last donation (used for recency scoring)';
COMMENT ON COLUMN donor.cancellation_count IS 'Number of recent cancellations (penalty in ranking)';
COMMENT ON COLUMN donor.completed_donations IS 'Cumulative count of successful donations (bonus in ranking)';
COMMENT ON FUNCTION calc_donor_response_rate IS 'Calculates donor acceptance rate: (accepted / total) * 100';
COMMENT ON FUNCTION calc_donor_composite_score IS 'Weighted ranking score: 40% reliability + 30% distance + 20% recency + penalties + bonuses';
COMMENT ON FUNCTION recalculate_donor_rankings IS 'Recalculates all available donors'' ranking scores; call on-demand or scheduled';
