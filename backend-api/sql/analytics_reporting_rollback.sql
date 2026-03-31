-- FEATURE 2 ROLLBACK: Advanced Analytics & Reporting
-- One-step removal script.
-- Safe to run multiple times.

BEGIN;

-- Drop all analytics views in dependency order
DROP VIEW IF EXISTS vw_top_blood_groups_demand CASCADE;
DROP VIEW IF EXISTS vw_appointment_completion_metrics CASCADE;
DROP VIEW IF EXISTS vw_response_rate_by_period CASCADE;
DROP VIEW IF EXISTS vw_blood_group_distribution CASCADE;
DROP VIEW IF EXISTS vw_patient_cohorts CASCADE;
DROP VIEW IF EXISTS vw_donor_cohorts CASCADE;
DROP VIEW IF EXISTS vw_appointment_trends CASCADE;
DROP VIEW IF EXISTS vw_analytics_summary CASCADE;

COMMIT;
