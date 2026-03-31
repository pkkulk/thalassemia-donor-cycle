/**
 * FEATURE 6: Donor Retention Nudges
 * Purpose: Track donor achievements, streaks, and send engagement nudges
 * 
 * Tables:
 * - donor_achievements: Track which badges each donor has earned
 * - donor_nudge_campaigns: Track sent nudge notifications
 * 
 * Views:
 * - vw_donor_stats: Donation count, streak, last donation per donor
 * - vw_top_donors: Leaderboard ranking by total donations
 * - vw_inactive_donors: Donors not active in 60+ days
 * - vw_donor_profile_summary: All metrics for donor profile
 * 
 * Functions:
 * - unlock_achievement(): Auto-unlock achievement when criteria met
 * - send_nudge_notification(): Create nudge campaign record + notification
 * - get_donor_leaderboard(): Return top N donors by donations
 *
 * One-step rollback:
 * - Run backend-api/sql/donor_retention_nudges_rollback.sql
 */

-- ============================================================================
-- TABLE: donor_achievements
-- ============================================================================
-- Stores which badges/achievements each donor has earned
CREATE TABLE IF NOT EXISTS donor_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donor(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL CHECK (achievement_type IN (
    'first_donation',      -- Donated for first time
    'five_donations',      -- Total donations = 5
    'ten_donations',       -- Total donations = 10
    'fifty_donations',     -- Total donations = 50
    'consistency_helper',  -- Donated in at least 3 different months
    'top_donor_monthly',   -- Among top 5 donors this month
    'streak_5mo'           -- Donated in 5 consecutive available periods
  )),
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notification_sent BOOLEAN DEFAULT FALSE,
  
  CONSTRAINT unique_donor_achievement UNIQUE(donor_id, achievement_type)
);

CREATE INDEX IF NOT EXISTS idx_donor_achievements_donor_id ON donor_achievements(donor_id);
CREATE INDEX IF NOT EXISTS idx_donor_achievements_unlocked ON donor_achievements(unlocked_at DESC);

-- ============================================================================
-- TABLE: donor_nudge_campaigns
-- ============================================================================
-- Tracks nudge notifications sent to donors
CREATE TABLE IF NOT EXISTS donor_nudge_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donor(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN (
    'first_donation',          -- Congratulations on first donation!
    'milestone_5',             -- Celebrate 5 donations
    'milestone_10',            -- Celebrate 10 donations
    'milestone_50',            -- Celebrate 50 donations
    'inactive_60days',         -- You've been inactive 60 days, patient needs you
    'consistency_achievement', -- Consistency badge unlocked
    'thank_you',               -- Generic thank you message
    'monthly_reminder'         -- Regular engagement nudge
  )),
  message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  action_taken BOOLEAN DEFAULT FALSE,
  action_taken_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_donor_nudge_campaigns_donor_id ON donor_nudge_campaigns(donor_id);
CREATE INDEX IF NOT EXISTS idx_donor_nudge_campaigns_sent ON donor_nudge_campaigns(sent_at DESC);

-- ============================================================================
-- VIEW: vw_donor_stats
-- ============================================================================
-- Aggregated stats for each donor: total donations, streak, last donation
CREATE OR REPLACE VIEW vw_donor_stats AS
SELECT
  d.id,
  d.name,
  d.blood_group,
  d.phone,
  COALESCE(donation_count.total, 0) AS total_donations,
  donation_count.last_donation_date,
  EXTRACT(DAY FROM NOW() - donation_count.last_donation_date)::INT AS days_since_donation,
  COALESCE(consecutive_months.streak, 0) AS consecutive_months_donated,
  CASE
    WHEN EXTRACT(DAY FROM NOW() - donation_count.last_donation_date) > 90 THEN 'inactive'
    WHEN EXTRACT(DAY FROM NOW() - donation_count.last_donation_date) > 60 THEN 'at_risk'
    WHEN EXTRACT(DAY FROM NOW() - donation_count.last_donation_date) > 30 THEN 'low_activity'
    ELSE 'active'
  END AS donor_status
FROM donor d
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) AS total,
    MAX(donor_completed_at)::DATE AS last_donation_date
  FROM appointments
  WHERE donor_id = d.id
    AND donor_completed_at IS NOT NULL
) donation_count ON TRUE
LEFT JOIN LATERAL (
  -- Count consecutive months with at least one donation
  WITH donation_months AS (
    SELECT DISTINCT DATE_TRUNC('month', donor_completed_at)::DATE AS month
    FROM appointments
    WHERE donor_id = d.id AND donor_completed_at IS NOT NULL
    ORDER BY month DESC
  ),
  streak_calc AS (
    SELECT month,
           ROW_NUMBER() OVER (ORDER BY month DESC) -
           EXTRACT(MONTH FROM month)::INT -
           EXTRACT(YEAR FROM month)::INT * 12 AS grp
    FROM donation_months
  )
  SELECT COUNT(*) AS streak
  FROM streak_calc
  GROUP BY grp
  ORDER BY streak DESC
  LIMIT 1
) consecutive_months ON TRUE;

-- ============================================================================
-- VIEW: vw_top_donors (Leaderboard)
-- ============================================================================
-- Ranked donors by total donations (for leaderboard)
CREATE OR REPLACE VIEW vw_top_donors AS
SELECT
  d.id,
  d.name,
  d.blood_group,
  COALESCE(COUNT(a.id), 0) AS total_donations,
  MAX(a.donor_completed_at)::DATE AS last_donated,
  ROW_NUMBER() OVER (ORDER BY COUNT(a.id) DESC) AS rank,
  CASE
    WHEN ROW_NUMBER() OVER (ORDER BY COUNT(a.id) DESC) = 1 THEN '🥇 Gold'
    WHEN ROW_NUMBER() OVER (ORDER BY COUNT(a.id) DESC) <= 3 THEN '🥈 Silver'
    WHEN ROW_NUMBER() OVER (ORDER BY COUNT(a.id) DESC) <= 10 THEN '🥉 Bronze'
    ELSE NULL
  END AS medal
FROM donor d
LEFT JOIN appointments a ON a.donor_id = d.id AND a.donor_completed_at IS NOT NULL
GROUP BY d.id, d.name, d.blood_group
ORDER BY total_donations DESC;

-- ============================================================================
-- VIEW: vw_inactive_donors
-- ============================================================================
-- Donors not active in 60+ days (for re-engagement campaigns)
CREATE OR REPLACE VIEW vw_inactive_donors AS
SELECT
  d.id,
  d.name,
  d.phone,
  d.blood_group,
  MAX(a.donor_completed_at)::DATE AS last_donated,
  EXTRACT(DAY FROM NOW() - MAX(a.donor_completed_at))::INT AS days_inactive,
  COALESCE(COUNT(a.id), 0) AS total_donations
FROM donor d
LEFT JOIN appointments a ON a.donor_id = d.id AND a.donor_completed_at IS NOT NULL
GROUP BY d.id, d.name, d.phone, d.blood_group
HAVING MAX(a.donor_completed_at)::DATE < NOW() - INTERVAL '60 days'
   OR MAX(a.donor_completed_at) IS NULL
ORDER BY days_inactive DESC;

-- ============================================================================
-- VIEW: vw_donor_profile_summary
-- ============================================================================
-- Complete profile for donor (stats + achievements)
CREATE OR REPLACE VIEW vw_donor_profile_summary AS
SELECT
  ds.id,
  ds.name,
  ds.blood_group,
  ds.phone,
  ds.total_donations,
  ds.last_donation_date,
  ds.days_since_donation,
  ds.consecutive_months_donated,
  ds.donor_status,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', da.achievement_type,
          'unlocked_at', da.unlocked_at
        )
        ORDER BY da.unlocked_at DESC
      )
      FROM donor_achievements da
      WHERE da.donor_id = ds.id
    ),
    '[]'::jsonb
  ) AS achievements,
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'type', n.campaign_type,
          'message', n.message,
          'sent_at', n.sent_at,
          'opened_at', n.opened_at
        )
        ORDER BY n.sent_at DESC
      )
      FROM (
        SELECT dnc.campaign_type, dnc.message, dnc.sent_at, dnc.opened_at
        FROM donor_nudge_campaigns dnc
        WHERE dnc.donor_id = ds.id
        ORDER BY dnc.sent_at DESC
        LIMIT 5
      ) n
    ),
    '[]'::jsonb
  ) AS recent_nudges,
  CASE
    WHEN ds.total_donations = 0 THEN 'Never donated'
    WHEN ds.donor_status = 'inactive' THEN 'Inactive - needs re-engagement'
    WHEN ds.donor_status = 'at_risk' THEN 'At risk - send nudge'
    WHEN ds.donor_status = 'low_activity' THEN 'Active but could engage more'
    ELSE 'Highly active'
  END AS retention_status
FROM vw_donor_stats ds;

-- ============================================================================
-- FUNCTION: unlock_achievement()
-- ============================================================================
-- Auto-unlock achievement when criteria met + create notification
CREATE OR REPLACE FUNCTION unlock_achievement(
  p_donor_id UUID,
  p_achievement_type TEXT,
  p_message TEXT DEFAULT NULL
)
RETURNS TABLE (
  achievement_id UUID,
  created BOOLEAN,
  notification_id UUID
) AS $$
DECLARE
  v_achievement_id UUID;
  v_notification_id UUID;
  v_message TEXT;
BEGIN
  -- Check if achievement already unlocked
  SELECT id INTO v_achievement_id FROM donor_achievements
  WHERE donor_id = p_donor_id AND achievement_type = p_achievement_type;
  
  IF v_achievement_id IS NOT NULL THEN
    -- Already unlocked
    RETURN QUERY SELECT v_achievement_id, FALSE::BOOLEAN, NULL::UUID;
    RETURN;
  END IF;
  
  -- Unlock achievement
  INSERT INTO donor_achievements (donor_id, achievement_type, notification_sent)
  VALUES (p_donor_id, p_achievement_type, FALSE)
  RETURNING id INTO v_achievement_id;
  
  -- Determine message if not provided
  v_message := COALESCE(p_message, 
    CASE p_achievement_type
      WHEN 'first_donation' THEN '🎖️ Welcome! You''ve started your lifesaving journey!'
      WHEN 'five_donations' THEN '🏆 Congratulations! 5 donations - you''re a hero!'
      WHEN 'ten_donations' THEN '⭐ Incredible! 10 donations - you''re a lifesaver!'
      WHEN 'fifty_donations' THEN '👑 Amazing! 50 donations - you''re royalty!'
      WHEN 'consistency_helper' THEN '💪 Consistency badge unlocked! You''ve donated multiple times!'
      WHEN 'top_donor_monthly' THEN '🔥 You''re among this month''s top donors!'
      WHEN 'streak_5mo' THEN '⚡ 5-month active donor badge - incredible dedication!'
      ELSE 'Achievement unlocked!'
    END
  );
  
  -- Create notification (in-app)
  INSERT INTO notifications (
    appointment_id,
    recipient_role,
    recipient_donor_id,
    event_type,
    title,
    message,
    payload
  )
  VALUES (
    NULL,
    'donor',
    p_donor_id,
    'achievement_unlocked',
    'Achievement Unlocked: ' || p_achievement_type,
    v_message,
    jsonb_build_object('achievement_type', p_achievement_type)
  )
  RETURNING id INTO v_notification_id;
  
  -- Mark achievement notification as sent
  UPDATE donor_achievements 
  SET notification_sent = TRUE
  WHERE id = v_achievement_id;
  
  RETURN QUERY SELECT v_achievement_id, TRUE::BOOLEAN, v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: send_nudge_notification()
-- ============================================================================
-- Send nudge campaign to donor + track in nudge_campaigns table
CREATE OR REPLACE FUNCTION send_nudge_notification(
  p_donor_id UUID,
  p_campaign_type TEXT,
  p_custom_message TEXT DEFAULT NULL
)
RETURNS TABLE (
  nudge_id UUID,
  notification_id UUID,
  message TEXT
) AS $$
DECLARE
  v_nudge_id UUID;
  v_notification_id UUID;
  v_message TEXT;
  v_donor_name TEXT;
BEGIN
  -- Get donor name for personalization
  SELECT name INTO v_donor_name FROM donor WHERE id = p_donor_id;
  
  -- Determine message
  v_message := COALESCE(p_custom_message,
    CASE p_campaign_type
      WHEN 'inactive_60days' THEN 'It''s been 60 days. A patient really needs you! 🙏'
      WHEN 'thank_you' THEN 'Thank you for being a lifesaver! Your donations matter! ❤️'
      WHEN 'monthly_reminder' THEN 'Reminder: Patients count on donors like you. Ready to help? 💪'
      WHEN 'consistency_achievement' THEN 'You''re a consistency champion! Keep up the amazing work!'
      ELSE 'Thank you for being part of our mission!'
    END
  );
  
  -- Create nudge campaign record
  INSERT INTO donor_nudge_campaigns (donor_id, campaign_type, message)
  VALUES (p_donor_id, p_campaign_type, v_message)
  RETURNING id INTO v_nudge_id;
  
  -- Create in-app notification
  INSERT INTO notifications (
    appointment_id,
    recipient_role,
    recipient_donor_id,
    event_type,
    title,
    message,
    payload
  )
  VALUES (
    NULL,
    'donor',
    p_donor_id,
    'nudge_campaign',
    'Nudge: ' || p_campaign_type,
    v_message,
    jsonb_build_object('campaign_type', p_campaign_type, 'nudge_id', v_nudge_id)
  )
  RETURNING id INTO v_notification_id;
  
  RETURN QUERY SELECT v_nudge_id, v_notification_id, v_message;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: check_and_unlock_achievements()
-- ============================================================================
-- Auto-check and unlock achievements when donation is completed
CREATE OR REPLACE FUNCTION check_and_unlock_achievements()
RETURNS TRIGGER AS $$
DECLARE
  v_donation_count INT;
  v_consecutive_months INT;
BEGIN
  -- Only process when donation completed (donor_completed_at set)
  IF NEW.donor_completed_at IS NOT NULL AND OLD.donor_completed_at IS NULL THEN
    -- Get total donations for this donor
    SELECT COUNT(*) INTO v_donation_count FROM appointments
    WHERE donor_id = NEW.donor_id AND donor_completed_at IS NOT NULL;
    
    -- Get consecutive months with donations
    SELECT COUNT(*) INTO v_consecutive_months FROM (
      SELECT DATE_TRUNC('month', donor_completed_at)::DATE AS month
      FROM appointments
      WHERE donor_id = NEW.donor_id AND donor_completed_at IS NOT NULL
      GROUP BY month
      ORDER BY month DESC
      LIMIT 5
    ) t;
    
    -- Unlock achievements based on donation count
    IF v_donation_count = 1 THEN
      PERFORM unlock_achievement(NEW.donor_id, 'first_donation');
    END IF;
    
    IF v_donation_count = 5 THEN
      PERFORM unlock_achievement(NEW.donor_id, 'five_donations');
    END IF;
    
    IF v_donation_count = 10 THEN
      PERFORM unlock_achievement(NEW.donor_id, 'ten_donations');
    END IF;
    
    IF v_donation_count = 50 THEN
      PERFORM unlock_achievement(NEW.donor_id, 'fifty_donations');
    END IF;
    
    IF v_consecutive_months >= 3 THEN
      PERFORM unlock_achievement(NEW.donor_id, 'consistency_helper');
    END IF;
    
    IF v_consecutive_months >= 5 THEN
      PERFORM unlock_achievement(NEW.donor_id, 'streak_5mo');
    END IF;
    
    -- Send thank you nudge
    PERFORM send_nudge_notification(NEW.donor_id, 'thank_you');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-check achievements on appointment update
DROP TRIGGER IF EXISTS trg_check_achievements ON appointments;
CREATE TRIGGER trg_check_achievements
AFTER UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION check_and_unlock_achievements();
