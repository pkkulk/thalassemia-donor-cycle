/**
 * API: GET /api/dashboard/donor-retention
 * Purpose: Get donor retention metrics for dashboard
 * Returns: active count, inactive count, at-risk donors, retention %.
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

export default async function handler(req, res) {
  applyCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get donor stats for all donors
    const { data: donorStats, error: statsError } = await supabase
      .from("vw_donor_stats")
      .select("id, name, donor_status, total_donations, days_since_donation");

    if (statsError) throw statsError;

    // Calculate metrics
    const active = donorStats.filter((d) => d.donor_status === "active").length;
    const lowActivity = donorStats.filter(
      (d) => d.donor_status === "low_activity",
    ).length;
    const atRisk = donorStats.filter(
      (d) => d.donor_status === "at_risk",
    ).length;
    const inactive = donorStats.filter(
      (d) => d.donor_status === "inactive",
    ).length;
    const total = donorStats.length;
    const retentionRate =
      total > 0
        ? (((active + lowActivity + atRisk) / total) * 100).toFixed(1)
        : 0;

    // Get at-risk donors (last 30 days)
    const { data: atRiskList, error: atRiskError } = await supabase
      .from("vw_donor_stats")
      .select("id, name, phone, total_donations, days_since_donation")
      .eq("donor_status", "at_risk")
      .order("days_since_donation", { ascending: false })
      .limit(10);

    if (atRiskError) throw atRiskError;

    // Get recent achievements (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentAchievements, error: achieveError } = await supabase
      .from("donor_achievements")
      .select("donor_id, achievement_type, unlocked_at, donor(name)")
      .gte("unlocked_at", sevenDaysAgo.toISOString())
      .order("unlocked_at", { ascending: false })
      .limit(10);

    if (achieveError) throw achieveError;

    return res.status(200).json({
      success: true,
      retention_metrics: {
        active,
        low_activity: lowActivity,
        at_risk: atRisk,
        inactive,
        total,
        retention_rate: parseFloat(retentionRate),
      },
      at_risk_donors: atRiskList || [],
      recent_achievements: recentAchievements || [],
    });
  } catch (error) {
    console.error("❌ Error fetching retention metrics:", error);
    return res.status(500).json({ error: "Failed to fetch retention metrics" });
  }
}
