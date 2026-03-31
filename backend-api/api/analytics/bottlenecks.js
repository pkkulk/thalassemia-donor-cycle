/**
 * API: GET /api/analytics/bottlenecks
 * Purpose: Identify appointment completion bottlenecks
 * Returns: Drop-off rates at each stage (assignment, acceptance, completion)
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
    // Fetch bottleneck metrics
    const { data: metrics, error: metricsError } = await supabase
      .from("vw_appointment_completion_metrics")
      .select("*");

    if (metricsError) throw metricsError;

    // Fetch response rates by period
    const { data: responseRates, error: ratesError } = await supabase
      .from("vw_response_rate_by_period")
      .select("*");

    if (ratesError) throw ratesError;

    // Identify critical bottlenecks (>30% drop-off)
    const criticalBottlenecks = (metrics || []).filter(
      (m) => m.drop_off_rate && m.drop_off_rate > 30,
    );

    // Calculate actionable insights
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
