/**
 * FEATURE 2: Advanced Analytics & Reporting
 * Purpose: Dashboard KPIs, trends, and cohort analysis for admin insights
 * 
 * Views:
 * - vw_analytics_summary: High-level KPIs (total donors, patients, completion rate, etc.)
 * - vw_appointment_trends: 7/30/90 day trends by status and outcome
 * - vw_donor_cohorts: Segment donors by status (new, active, at-risk, inactive)
 * - vw_patient_cohorts: Segment patients by appointment frequency
 * - vw_blood_group_distribution: Inventory and demand by blood group
 * - vw_response_rate_by_period: Donor response metrics over time
 * - vw_appointment_completion_metrics: Completion rates and bottlenecks
 * 
 * One-step rollback:
 * - Run backend-api/sql/analytics_reporting_rollback.sql
 */

-- ============================================================================
-- VIEW: vw_analytics_summary
-- ============================================================================
-- High-level KPIs: total counts, completion rates, key metrics
CREATE OR REPLACE VIEW vw_analytics_summary AS
SELECT
  (SELECT COUNT(*) FROM donor WHERE available = TRUE) AS active_donors,
  (SELECT COUNT(*) FROM donor) AS total_donors,
  (SELECT COUNT(*) FROM patients) AS total_patients,
  (SELECT COUNT(*) FROM appointments) AS total_appointments,
  (SELECT COUNT(*) FROM appointments WHERE status = 'Completed') AS completed_appointments,
  ROUND(
    CASE 
      WHEN (SELECT COUNT(*) FROM appointments) > 0 
      THEN (SELECT COUNT(*) FROM appointments WHERE status = 'Completed')::NUMERIC / 
           (SELECT COUNT(*) FROM appointments)::NUMERIC * 100
      ELSE 0
    END, 2
  ) AS overall_completion_rate,
  (SELECT COUNT(*) FROM appointments WHERE status = 'Declined') AS declined_appointments,
  (SELECT COUNT(*) FROM appointments WHERE status = 'Scheduled' AND donor_id IS NULL) AS unassigned_appointments,
  (SELECT COUNT(*) FROM vw_donor_stats WHERE donor_status = 'active') AS active_donor_count,
  (SELECT COUNT(*) FROM vw_donor_stats WHERE donor_status = 'at_risk') AS at_risk_donor_count,
  (SELECT COUNT(*) FROM vw_donor_stats WHERE donor_status = 'inactive') AS inactive_donor_count;

-- ============================================================================
-- VIEW: vw_appointment_trends
-- ============================================================================
-- 7/30/90 day appointment trends by status
CREATE OR REPLACE VIEW vw_appointment_trends AS
WITH date_ranges AS (
  SELECT
    'last_7_days' AS period,
    NOW() - INTERVAL '7 days' AS start_date,
    NOW() AS end_date
  UNION ALL
  SELECT
    'last_30_days' AS period,
    NOW() - INTERVAL '30 days' AS start_date,
    NOW() AS end_date
  UNION ALL
  SELECT
    'last_90_days' AS period,
    NOW() - INTERVAL '90 days' AS start_date,
    NOW() AS end_date
)
SELECT
  dr.period,
  COUNT(a.id) AS total,
  COUNT(CASE WHEN a.status = 'Scheduled' THEN 1 END) AS scheduled,
  COUNT(CASE WHEN a.status = 'Accepted' THEN 1 END) AS accepted,
  COUNT(CASE WHEN a.status = 'Declined' THEN 1 END) AS declined,
  COUNT(CASE WHEN a.status = 'Donated' THEN 1 END) AS donated,
  COUNT(CASE WHEN a.status = 'Completed' THEN 1 END) AS completed,
  ROUND(
    CASE 
      WHEN COUNT(a.id) > 0 
      THEN COUNT(CASE WHEN a.status = 'Completed' THEN 1 END)::NUMERIC / COUNT(a.id)::NUMERIC * 100
      ELSE 0
    END, 2
  ) AS completion_rate,
  ROUND(
    CASE 
      WHEN COUNT(a.id) > 0 
      THEN COUNT(CASE WHEN a.status = 'Declined' THEN 1 END)::NUMERIC / COUNT(a.id)::NUMERIC * 100
      ELSE 0
    END, 2
  ) AS decline_rate
FROM date_ranges dr
LEFT JOIN appointments a ON a.created_at >= dr.start_date AND a.created_at <= dr.end_date
GROUP BY dr.period, dr.start_date, dr.end_date
ORDER BY 
  CASE 
    WHEN dr.period = 'last_7_days' THEN 1
    WHEN dr.period = 'last_30_days' THEN 2
    WHEN dr.period = 'last_90_days' THEN 3
  END;

-- ============================================================================
-- VIEW: vw_donor_cohorts
-- ============================================================================
-- Segment donors by activity/retention status
CREATE OR REPLACE VIEW vw_donor_cohorts AS
SELECT
  'active' AS cohort,
  COUNT(*) AS count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM donor WHERE available = TRUE)::NUMERIC * 100, 2) AS percentage,
  'Has donated in last 30 days' AS description
FROM vw_donor_stats
WHERE donor_status = 'active'
UNION ALL
SELECT
  'low_activity' AS cohort,
  COUNT(*) AS count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM donor WHERE available = TRUE)::NUMERIC * 100, 2) AS percentage,
  'Has donated in last 30-90 days' AS description
FROM vw_donor_stats
WHERE donor_status = 'low_activity'
UNION ALL
SELECT
  'at_risk' AS cohort,
  COUNT(*) AS count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM donor WHERE available = TRUE)::NUMERIC * 100, 2) AS percentage,
  'Has not donated in 60-90 days' AS description
FROM vw_donor_stats
WHERE donor_status = 'at_risk'
UNION ALL
SELECT
  'inactive' AS cohort,
  COUNT(*) AS count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM donor WHERE available = TRUE)::NUMERIC * 100, 2) AS percentage,
  'Has not donated in 90+ days' AS description
FROM vw_donor_stats
WHERE donor_status = 'inactive'
UNION ALL
SELECT
  'never_donated' AS cohort,
  COUNT(*) AS count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM donor WHERE available = TRUE)::NUMERIC * 100, 2) AS percentage,
  'Never donated' AS description
FROM donor d
WHERE d.available = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM appointments a
    WHERE a.donor_id = d.id AND a.donor_completed_at IS NOT NULL
  );

-- ============================================================================
-- VIEW: vw_patient_cohorts
-- ============================================================================
-- Segment patients by appointment frequency
CREATE OR REPLACE VIEW vw_patient_cohorts AS
WITH patient_appointment_counts AS (
  SELECT
    p.id,
    COUNT(a.id) AS appt_count
  FROM patients p
  LEFT JOIN appointments a ON a.patient_id = p.id AND a.status = 'Completed'
  GROUP BY p.id
)
SELECT
  'first_time' AS cohort,
  COUNT(*) AS count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM patients)::NUMERIC * 100, 2) AS percentage,
  'Never had a completed appointment' AS description
FROM patient_appointment_counts
WHERE appt_count = 0
UNION ALL
SELECT
  'regular' AS cohort,
  COUNT(*) AS count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM patients)::NUMERIC * 100, 2) AS percentage,
  '1-5 appointments' AS description
FROM patient_appointment_counts
WHERE appt_count BETWEEN 1 AND 5
UNION ALL
SELECT
  'frequent' AS cohort,
  COUNT(*) AS count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM patients)::NUMERIC * 100, 2) AS percentage,
  '6+ appointments' AS description
FROM patient_appointment_counts
WHERE appt_count > 5;

-- ============================================================================
-- VIEW: vw_blood_group_distribution
-- ============================================================================
-- Blood group inventory and demand metrics
CREATE OR REPLACE VIEW vw_blood_group_distribution AS
SELECT
  d.blood_group,
  COUNT(d.id) AS donor_count,
  COALESCE(COUNT(CASE WHEN ds.donor_status = 'active' THEN 1 END), 0) AS active_available,
  COUNT(p.id) AS patient_demand,
  ROUND(
    CASE 
      WHEN COUNT(p.id) > 0 
      THEN COUNT(d.id)::NUMERIC / COUNT(p.id)::NUMERIC
      ELSE 0
    END, 2
  ) AS supply_to_demand_ratio,
  CASE 
    WHEN ROUND(COUNT(d.id)::NUMERIC / NULLIF(COUNT(p.id)::NUMERIC, 0), 2) IS NULL THEN 'No patients'
    WHEN ROUND(COUNT(d.id)::NUMERIC / COUNT(p.id)::NUMERIC, 2) < 1.0 THEN 'Supply shortage'
    WHEN ROUND(COUNT(d.id)::NUMERIC / COUNT(p.id)::NUMERIC, 2) < 1.5 THEN 'Tight supply'
    ELSE 'Adequate supply'
  END AS supply_status
FROM donor d
LEFT JOIN vw_donor_stats ds ON ds.id = d.id
FULL OUTER JOIN patients p ON d.blood_group = p.blood_group
GROUP BY d.blood_group
ORDER BY supply_to_demand_ratio ASC;

-- ============================================================================
-- VIEW: vw_response_rate_by_period
-- ============================================================================
-- Donor response rates over 7/30/90 day periods
CREATE OR REPLACE VIEW vw_response_rate_by_period AS
WITH periods AS (
  SELECT
    'last_7_days' AS period,
    NOW() - INTERVAL '7 days' AS start_date
  UNION ALL
  SELECT 'last_30_days', NOW() - INTERVAL '30 days'
  UNION ALL
  SELECT 'last_90_days', NOW() - INTERVAL '90 days'
)
SELECT
  p.period,
  COUNT(a.id) AS total_offered,
  COUNT(CASE WHEN a.status IN ('Accepted', 'Donated', 'Completed') THEN 1 END) AS accepted,
  COUNT(CASE WHEN a.status = 'Declined' THEN 1 END) AS declined,
  COUNT(CASE WHEN a.status = 'Scheduled' AND a.donor_id IS NOT NULL AND a.donor_completed_at IS NULL THEN 1 END) AS pending,
  ROUND(
    CASE 
      WHEN COUNT(a.id) > 0 
      THEN COUNT(CASE WHEN a.status IN ('Accepted', 'Donated', 'Completed') THEN 1 END)::NUMERIC / COUNT(a.id)::NUMERIC * 100
      ELSE 0
    END, 2
  ) AS acceptance_rate
FROM periods p
LEFT JOIN appointments a ON a.created_at >= p.start_date AND a.created_at <= NOW() AND a.donor_id IS NOT NULL
GROUP BY p.period
ORDER BY 
  CASE 
    WHEN p.period = 'last_7_days' THEN 1
    WHEN p.period = 'last_30_days' THEN 2
    WHEN p.period = 'last_90_days' THEN 3
  END;

-- ============================================================================
-- VIEW: vw_appointment_completion_metrics
-- ============================================================================
-- Bottleneck analysis: where appointments fail
CREATE OR REPLACE VIEW vw_appointment_completion_metrics AS
SELECT
  'Total Appointments' AS stage,
  COUNT(*) AS count,
  NULL::NUMERIC AS drop_off_rate
FROM appointments
UNION ALL
SELECT
  'Assigned to Donor',
  COUNT(*),
  ROUND(
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(*) - (SELECT COUNT(*) FROM appointments WHERE donor_id IS NOT NULL))::NUMERIC
        / COUNT(*)::NUMERIC * 100
      ELSE 0
    END,
    2
  )
FROM appointments
WHERE donor_id IS NOT NULL
UNION ALL
SELECT
  'Accepted by Donor',
  COUNT(*),
  ROUND(
    CASE
      WHEN (SELECT COUNT(*) FROM appointments WHERE donor_id IS NOT NULL) > 0 THEN
        ((SELECT COUNT(*) FROM appointments WHERE donor_id IS NOT NULL) - COUNT(*))::NUMERIC
        / (SELECT COUNT(*) FROM appointments WHERE donor_id IS NOT NULL)::NUMERIC * 100
      ELSE 0
    END,
    2
  )
FROM appointments
WHERE status IN ('Accepted', 'Donated', 'Completed')
UNION ALL
SELECT
  'Completed',
  COUNT(*),
  ROUND(
    CASE
      WHEN (SELECT COUNT(*) FROM appointments WHERE status IN ('Accepted', 'Donated', 'Completed')) > 0 THEN
        ((SELECT COUNT(*) FROM appointments WHERE status IN ('Accepted', 'Donated', 'Completed')) - COUNT(*))::NUMERIC
        / (SELECT COUNT(*) FROM appointments WHERE status IN ('Accepted', 'Donated', 'Completed'))::NUMERIC * 100
      ELSE 0
    END,
    2
  )
FROM appointments
WHERE status = 'Completed';

-- ============================================================================
-- VIEW: vw_top_blood_groups_demand
-- ============================================================================
-- Which blood groups are most in demand
CREATE OR REPLACE VIEW vw_top_blood_groups_demand AS
SELECT
  p.blood_group,
  COUNT(p.id) AS patient_count,
  COUNT(DISTINCT a.id) AS appointments_needed,
  ROUND(
    COUNT(DISTINCT a.id)::NUMERIC / NULLIF(COUNT(p.id)::NUMERIC, 0), 2
  ) AS avg_appts_per_patient
FROM patients p
LEFT JOIN appointments a ON a.patient_id = p.id AND a.status = 'Completed'
GROUP BY p.blood_group
ORDER BY appointments_needed DESC;

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================
COMMENT ON VIEW vw_analytics_summary IS 'High-level KPIs for dashboard summary cards';
COMMENT ON VIEW vw_appointment_trends IS 'Appointment status trends over different time periods';
COMMENT ON VIEW vw_donor_cohorts IS 'Donor segmentation by activity/retention status';
COMMENT ON VIEW vw_patient_cohorts IS 'Patient segmentation by appointment frequency';
COMMENT ON VIEW vw_blood_group_distribution IS 'Blood group supply vs demand analysis';
COMMENT ON VIEW vw_response_rate_by_period IS 'Donor response rates over time';
COMMENT ON VIEW vw_appointment_completion_metrics IS 'Bottleneck analysis for appointment completion pipeline';
COMMENT ON VIEW vw_top_blood_groups_demand IS 'Blood groups with highest demand';
