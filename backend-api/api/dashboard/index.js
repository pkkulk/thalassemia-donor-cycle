/**
 * Unified Dashboard API Router
 * Consolidates: donor-retention.js, donor-leaderboard.js
 * 
 * Routes:
 * - GET ?metric=retention (replaces /donor-retention.js)
 * - GET ?metric=leaderboard (replaces /donor-leaderboard.js)
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

// Retention metric: GET /api/dashboard?metric=retention
async function handleRetention(req, res) {
  try {
    const { data: donorStats, error: statsError } = await supabase
      .from("vw_donor_stats")
      .select("id, name, donor_status, total_donations, days_since_donation");

    if (statsError) throw statsError;

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

    const { data: atRiskList, error: atRiskError } = await supabase
      .from("vw_donor_stats")
      .select("id, name, phone, total_donations, days_since_donation")
      .eq("donor_status", "at_risk")
      .order("days_since_donation", { ascending: false })
      .limit(10);

    if (atRiskError) throw atRiskError;

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
      retention: {
        active_count: active,
        low_activity_count: lowActivity,
        at_risk_count: atRisk,
        inactive_count: inactive,
        total_donors: total,
        retention_percentage: parseFloat(retentionRate),
      },
      at_risk_donors: atRiskList || [],
      recent_achievements: recentAchievements || [],
    });
  } catch (error) {
    console.error("❌ Error fetching retention metrics:", error);
    return res.status(500).json({ error: "Failed to fetch retention metrics" });
  }
}

// Leaderboard metric: GET /api/dashboard?metric=leaderboard
async function handleLeaderboard(req, res) {
  const { limit = 10, timeframe = "all" } = req.query;

  try {
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from("vw_top_donors")
      .select(
        "rank, id, name, blood_group, total_donations, last_donated, medal",
      )
      .gt("total_donations", 0)
      .order("rank", { ascending: true })
      .limit(parseInt(limit));

    if (leaderboardError) throw leaderboardError;

    const enrichedLeaderboard = await Promise.all(
      leaderboard.map(async (donor) => {
        const { data: achievements, error: achieveError } = await supabase
          .from("donor_achievements")
          .select("achievement_type")
          .eq("donor_id", donor.id);

        return {
          ...donor,
          achievements: achievements || [],
          achievement_count: achievements?.length || 0,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      leaderboard: enrichedLeaderboard,
      timeframe,
      total: enrichedLeaderboard.length,
    });
  } catch (error) {
    console.error("❌ Error fetching leaderboard:", error);
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
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

  const { metric } = req.query;

  try {
    switch (metric) {
      case "retention":
        return await handleRetention(req, res);
      case "leaderboard":
        return await handleLeaderboard(req, res);
      default:
        return res.status(400).json({
          error: `Unknown metric: ${metric}. Valid metrics: retention, leaderboard`,
        });
    }
  } catch (error) {
    console.error("❌ Unexpected error in dashboard router:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
