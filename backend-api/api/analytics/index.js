/**
 * Unified Analytics API Router
 * Consolidates: summary.js, supply-demand.js, bottlenecks.js
 * 
 * Routes:
 * - GET ?report=summary (replaces /summary.js)
 * - GET ?report=supply-demand (replaces /supply-demand.js)
 * - GET ?report=bottlenecks (replaces /bottlenecks.js)
 */

import supabase from "../../utils/supabaseClient.js";

function applyCors(res) {
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
}

// Summary report: GET /api/analytics?report=summary
async function handleSummary(req, res) {
  try {
    const { data: summary, error: summaryError } = await supabase
      .from("vw_analytics_summary")
      .select("*")
      .single();

    if (summaryError) throw summaryError;

    const { data: trends, error: trendsError } = await supabase
      .from("vw_appointment_trends")
      .select("*");

    if (trendsError) throw trendsError;

    const { data: donorCohorts, error: donorCohortsError } = await supabase
      .from("vw_donor_cohorts")
      .select("*");

    if (donorCohortsError) throw donorCohortsError;

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

// Supply-Demand report: GET /api/analytics?report=supply-demand
async function handleSupplyDemand(req, res) {
  try {
    const { data: bloodGroups, error: bgError } = await supabase
      .from("vw_blood_group_distribution")
      .select("*");

    if (bgError) throw bgError;

    const { data: topDemand, error: demandError } = await supabase
      .from("vw_top_blood_groups_demand")
      .select("*")
      .limit(10);

    if (demandError) throw demandError;

    const shortages = (bloodGroups || []).filter(
      (bg) =>
        bg.supply_status === "Supply shortage" ||
        bg.supply_status === "Tight supply",
    );

    return res.status(200).json({
      success: true,
      blood_groups: bloodGroups || [],
      top_demand: topDemand || [],
      shortage_alerts: shortages,
      shortage_count: shortages.length,
    });
  } catch (error) {
    console.error("❌ Error fetching supply-demand analysis:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch supply-demand analysis" });
  }
}

// Bottlenecks report: GET /api/analytics?report=bottlenecks
async function handleBottlenecks(req, res) {
  try {
    const { data: metrics, error: metricsError } = await supabase
      .from("vw_appointment_completion_metrics")
      .select("*");

    if (metricsError) throw metricsError;

    const { data: responseRates, error: ratesError } = await supabase
      .from("vw_response_rate_by_period")
      .select("*");

    if (ratesError) throw ratesError;

    const criticalBottlenecks = (metrics || []).filter(
      (m) => m.drop_off_rate && m.drop_off_rate > 30,
    );

    const insights = [];

    if (criticalBottlenecks.length > 0) {
      insights.push({
        type: "warning",
        message: `${criticalBottlenecks.length} critical bottleneck(s) detected: ${criticalBottlenecks.map((b) => b.stage).join(", ")}`,
        severity: "high",
      });
    }

    const latestRates = responseRates?.[responseRates.length - 1];
    if (latestRates?.acceptance_rate && latestRates.acceptance_rate < 60) {
      insights.push({
        type: "alert",
        message: `Low donor acceptance rate (${latestRates.acceptance_rate}%). Consider targeted engagement.`,
        severity: "medium",
      });
    }

    return res.status(200).json({
      success: true,
      completion_pipeline: metrics || [],
      response_rates: responseRates || [],
      bottlenecks: criticalBottlenecks,
      insights,
    });
  } catch (error) {
    console.error("❌ Error fetching bottleneck analysis:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch bottleneck analysis" });
  }
}

// Main handler
export default async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { report } = req.query;

  try {
    switch (report) {
      case "summary":
        return await handleSummary(req, res);
      case "supply-demand":
        return await handleSupplyDemand(req, res);
      case "bottlenecks":
        return await handleBottlenecks(req, res);
      default:
        return res.status(400).json({
          error: `Unknown report: ${report}. Valid reports: summary, supply-demand, bottlenecks`,
        });
    }
  } catch (error) {
    console.error("❌ Unexpected error in analytics router:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
