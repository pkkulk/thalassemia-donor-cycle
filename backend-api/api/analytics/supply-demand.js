/**
 * API: GET /api/analytics/supply-demand
 * Purpose: Blood group supply vs demand analysis
 * Returns: Supply/demand metrics by blood group
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
    // Fetch blood group distribution
    const { data: bloodGroups, error: bgError } = await supabase
      .from("vw_blood_group_distribution")
      .select("*");

    if (bgError) throw bgError;

    // Fetch top blood groups by demand
    const { data: topDemand, error: demandError } = await supabase
      .from("vw_top_blood_groups_demand")
      .select("*")
      .limit(10);

    if (demandError) throw demandError;

    // Calculate shortage alerts
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
