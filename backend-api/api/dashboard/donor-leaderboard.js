/**
 * API: GET /api/dashboard/donor-leaderboard
 * Purpose: Get top donors leaderboard
 * Params:
 *   - limit=10 (default: top 10)
 *   - timeframe='all' (default: all time, future: 'month', 'year')
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

  const { limit = 10, timeframe = "all" } = req.query;

  try {
    // For now, fetch from vw_top_donors (all-time rankings)
    // Future: can filter by timeframe
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from("vw_top_donors")
      .select(
        "rank, id, name, blood_group, total_donations, last_donated, medal",
      )
      .gt("total_donations", 0)
      .order("rank", { ascending: true })
      .limit(parseInt(limit));

    if (leaderboardError) throw leaderboardError;

    // Enhance with achievements
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
