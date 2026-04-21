/**
 * API: GET /api/analytics/bottlenecks
 * Purpose: Identify appointment completion bottlenecks
 * Returns: Drop-off rates at each stage (assignment, acceptance, completion)
 */

import supabase from "../../utils/supabaseClient.js";

const round2 = (value) => Math.round(value * 100) / 100;

const percent = (numerator, denominator) => {
  if (!denominator || denominator <= 0) return 0;
  return round2((numerator / denominator) * 100);
};

async function buildFallbackCompletionPipeline() {
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id, donor_id, status");

  if (error) throw error;

  const rows = appointments || [];
  const total = rows.length;
  const assigned = rows.filter((r) => Boolean(r.donor_id)).length;
  const acceptedOrBetter = rows.filter((r) =>
    ["Accepted", "Donated", "Completed"].includes(r.status),
  ).length;
  const completed = rows.filter((r) => r.status === "Completed").length;

  return [
    {
      stage: "Total Appointments",
      count: total,
      drop_off_rate: null,
    },
    {
      stage: "Assigned to Donor",
      count: assigned,
      drop_off_rate: percent(total - assigned, total),
    },
    {
      stage: "Accepted by Donor",
      count: acceptedOrBetter,
      drop_off_rate: percent(assigned - acceptedOrBetter, assigned),
    },
    {
      stage: "Completed",
      count: completed,
      drop_off_rate: percent(acceptedOrBetter - completed, acceptedOrBetter),
    },
  ];
}

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
    let metrics = [];
    const { data: metricsData, error: metricsError } = await supabase
      .from("vw_appointment_completion_metrics")
      .select("*");

    if (metricsError) {
      // Guard against DB view math errors (e.g. division by zero) by deriving
      // the pipeline from raw appointments instead of failing the endpoint.
      console.warn(
        "Analytics view failed for completion metrics. Falling back to computed pipeline:",
        metricsError,
      );
      metrics = await buildFallbackCompletionPipeline();
    } else {
      metrics = metricsData || [];
    }

    // Fetch response rates by period
    let responseRates = [];
    const { data: ratesData, error: ratesError } = await supabase
      .from("vw_response_rate_by_period")
      .select("*");

    if (ratesError) {
      console.warn(
        "Analytics view failed for response rates. Returning empty response rates:",
        ratesError,
      );
      responseRates = [];
    } else {
      responseRates = ratesData || [];
    }

    // Identify critical bottlenecks (>30% drop-off)
    const criticalBottlenecks = metrics.filter(
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
      completion_pipeline: metrics,
      response_rates: responseRates,
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
