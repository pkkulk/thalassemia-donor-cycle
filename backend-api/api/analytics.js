/**
 * Consolidated Analytics Router
 * Routes: /api/analytics/summary, /api/analytics/supply-demand, /api/analytics/bottlenecks
 */

import supabase from "../utils/supabaseClient.js";

// CORS helper
function setCORS(res) {
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

async function getSummary() {
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

  return {
    success: true,
    summary,
    trends,
    donor_cohorts: donorCohorts || [],
    patient_cohorts: patientCohorts || [],
  };
}

async function getSupplyDemand() {
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

  return {
    success: true,
    blood_groups: bloodGroups || [],
    top_demand: topDemand || [],
    shortage_alerts: shortages,
    shortage_count: shortages.length,
  };
}

async function getBottlenecks() {
  const { data: bottlenecks, error: bottlenecksError } = await supabase
    .from("vw_appointment_bottlenecks")
    .select("*");
  if (bottlenecksError) throw bottlenecksError;

  const { data: completionMetrics, error: completionError } = await supabase
    .from("vw_appointment_completion_metrics")
    .select("*");
  if (completionError) throw completionError;

  return {
    success: true,
    bottlenecks: bottlenecks || [],
    completion_metrics: completionMetrics || [],
  };
}

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Route based on query parameter or path
    const route = req.query.route || "summary";

    let result;
    if (route === "summary") {
      result = await getSummary();
    } else if (route === "supply-demand") {
      result = await getSupplyDemand();
    } else if (route === "bottlenecks") {
      result = await getBottlenecks();
    } else {
      return res.status(404).json({ error: "Route not found" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ Analytics error:", error);
    return res.status(500).json({ error: "Failed to fetch analytics" });
  }
}
