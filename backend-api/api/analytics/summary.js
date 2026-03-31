/**
 * API: GET /api/analytics/summary
 * Purpose: Get KPI summary for dashboard cards
 * Returns: Overview metrics (total counts, rates, cohort sizes)
 */

import supabase from "../../utils/supabaseClient.js";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Fetch summary KPIs
    const { data: summary, error: summaryError } = await supabase
      .from("vw_analytics_summary")
      .select("*")
      .single();

    if (summaryError) throw summaryError;

    // Fetch trend data (7/30/90 days)
    const { data: trends, error: trendsError } = await supabase
      .from("vw_appointment_trends")
      .select("*");

    if (trendsError) throw trendsError;

    // Fetch donor cohorts
    const { data: donorCohorts, error: donorCohortsError } = await supabase
      .from("vw_donor_cohorts")
      .select("*");

    if (donorCohortsError) throw donorCohortsError;

    // Fetch patient cohorts
    const { data: patientCohorts, error: patientCohortsError } = await supabase
      .from("vw_patient_cohorts")
      .select("*");

    if (patientCohortsError) throw patientCohortsError;

    return res.status(200).json({
      success: true,
      summary,
      trends,
      donor_cohorts: donorCohorts || [],
      patient_cohorts: patientCohorts || [],
    });
  } catch (error) {
    console.error("❌ Error fetching analytics summary:", error);
    return res.status(500).json({ error: "Failed to fetch analytics summary" });
  }
}
