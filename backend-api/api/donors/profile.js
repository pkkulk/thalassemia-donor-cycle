/**
 * API: GET /api/donors/:donor_id/profile
 * Purpose: Get donor profile with stats and achievements
 * Authorization: donor_id matches current user OR admin
 */

import supabase from "../../utils/supabaseClient.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { donor_id } = req.query;

  if (!donor_id) {
    return res.status(400).json({ error: "Missing donor_id" });
  }

  try {
    // Fetch donor profile with stats and achievements
    const { data: profile, error: profileError } = await supabase
      .from("vw_donor_profile_summary")
      .select("*")
      .eq("id", donor_id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "Donor profile not found" });
    }

    // Fetch leaderboard rank for this donor
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from("vw_top_donors")
      .select("rank, medal")
      .eq("id", donor_id)
      .single();

    const rank = leaderboard?.rank || null;
    const medal = leaderboard?.medal || null;

    // Calculate impact (rough estimate: 1 donation helps ~3 patients)
    const impactCount = profile.total_donations * 3;

    return res.status(200).json({
      success: true,
      donor: {
        id: profile.id,
        name: profile.name,
        blood_group: profile.blood_group,
        phone: profile.phone,
        stats: {
          total_donations: profile.total_donations,
          last_donation_date: profile.last_donation_date,
          days_since_donation: profile.days_since_donation,
          consecutive_months_donated: profile.consecutive_months_donated,
          donor_status: profile.donor_status,
          retention_status: profile.retention_status,
        },
        leaderboard: {
          rank,
          medal,
          impact_count: impactCount,
        },
        achievements: profile.achievements || [],
        recent_nudges: profile.recent_nudges || [],
      },
    });
  } catch (error) {
    console.error("❌ Error fetching donor profile:", error);
    return res.status(500).json({ error: "Failed to fetch donor profile" });
  }
}
