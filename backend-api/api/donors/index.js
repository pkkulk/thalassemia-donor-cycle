/**
 * Unified Donors API Router
 * Consolidates: rank.js, profile.js, nudge.js
 * 
 * Routes:
 * - GET ?action=rank (replaces /rank.js)
 * - GET ?action=profile&donor_id=xyz (replaces /profile.js)
 * - POST ?action=nudge&donor_id=xyz (replaces /nudge.js)
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// Rank action: GET /api/donors?action=rank&appointment_id=xyz
async function handleRank(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { appointment_id, limit = 10 } = req.query;

  if (!appointment_id) {
    return res
      .status(400)
      .json({ error: "Missing required param: appointment_id" });
  }

  try {
    console.log(`📊 Ranking donors for appointment: ${appointment_id}`);

    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select("patient_id, date, blood_group")
      .eq("id", appointment_id)
      .single();

    if (apptError || !appointment) {
      console.error("❌ Appointment not found:", apptError);
      return res.status(404).json({ error: "Appointment not found" });
    }

    const { data: linkedDonors, error: linkError } = await supabase
      .from("patient_donor_links")
      .select("donor_id")
      .eq("patient_id", appointment.patient_id)
      .eq("status", "approved");

    if (linkError) {
      console.error("❌ Error fetching patient-donor links:", linkError);
      return res.status(500).json({ error: "Failed to fetch donor links" });
    }

    const linkedDonorIds = linkedDonors.map((link) => link.donor_id);
    console.log(`🔗 Found ${linkedDonorIds.length} approved linked donors`);

    let query = supabase.from("vw_top_ranked_donors").select("*");

    if (linkedDonorIds.length > 0) {
      query = query.in("id", linkedDonorIds);
    }

    const { data: rankedDonors, error: rankError } = await query.limit(limit);

    if (rankError) {
      console.error("❌ Error fetching ranked donors:", rankError);
      return res.status(500).json({ error: "Failed to fetch ranked donors" });
    }

    const enhancedDonors = rankedDonors.map((donor, index) => ({
      id: donor.id,
      name: donor.name,
      blood_group: donor.blood_group,
      distance_km: donor.distance_km,
      response_rate: donor.response_rate,
      completed_donations: donor.completed_donations,
      cancellation_count: donor.cancellation_count,
      composite_score: donor.composite_score,
      donor_rank: index + 1,
      confidence_level:
        donor.composite_score >= 80
          ? "High"
          : donor.composite_score >= 60
            ? "Medium"
            : "Low",
      ranking_breakdown: {
        reliability_score: (donor.response_rate * 0.4).toFixed(2),
        distance_score: (donor.distance_km
          ? (100 / donor.distance_km) * 100 * 0.3
          : 50 * 0.3
        ).toFixed(2),
        recency_score: (donor.recent_activity_days
          ? Math.min(100, Math.max(50, 100 - donor.recent_activity_days * 2)) *
            0.2
          : 50 * 0.2
        ).toFixed(2),
        penalty_bonus: (
          -donor.cancellation_count * 10 +
          Math.floor(donor.completed_donations / 5) * 5
        ).toFixed(2),
      },
      score_explanation:
        donor.composite_score >= 80
          ? "★★★ Excellent - High acceptance rate, recent activity, minimal cancellations"
          : donor.composite_score >= 60
            ? "★★ Good - Reliable performer with moderate activity"
            : "★ Fair - Limited activity or recent cancellations",
    }));

    console.log(
      `✅ Ranked ${enhancedDonors.length} donors for appointment ${appointment_id}`,
    );

    return res.status(200).json({
      appointment_id,
      patient_id: appointment.patient_id,
      appointment_date: appointment.date,
      blood_group: appointment.blood_group,
      ranked_donors: enhancedDonors,
      total_ranked: enhancedDonors.length,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Unexpected error in rank action:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Profile action: GET /api/donors?action=profile&donor_id=xyz
async function handleProfile(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { donor_id } = req.query;

  if (!donor_id) {
    return res.status(400).json({ error: "Missing donor_id" });
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("vw_donor_profile_summary")
      .select("*")
      .eq("id", donor_id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "Donor profile not found" });
    }

    const { data: leaderboard, error: leaderboardError } = await supabase
      .from("vw_top_donors")
      .select("rank, medal")
      .eq("id", donor_id)
      .single();

    const rank = leaderboard?.rank || null;
    const medal = leaderboard?.medal || null;
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

// Nudge action: POST /api/donors?action=nudge&donor_id=xyz
async function handleNudge(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { donor_id } = req.query;
  const { campaign_type, custom_message } = req.body;

  if (!donor_id || !campaign_type) {
    return res.status(400).json({
      error: "Missing required fields: donor_id, campaign_type",
    });
  }

  const validCampaigns = [
    "first_donation",
    "milestone_5",
    "milestone_10",
    "milestone_50",
    "inactive_60days",
    "consistency_achievement",
    "thank_you",
    "monthly_reminder",
  ];

  if (!validCampaigns.includes(campaign_type)) {
    return res
      .status(400)
      .json({ error: `Invalid campaign_type: ${campaign_type}` });
  }

  try {
    const { data, error } = await supabase.rpc("send_nudge_notification", {
      p_donor_id: donor_id,
      p_campaign_type: campaign_type,
      p_custom_message: custom_message || null,
    });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      nudge_id: data[0].nudge_id,
      notification_id: data[0].notification_id,
      message: data[0].message,
    });
  } catch (error) {
    console.error("❌ Error sending nudge:", error);
    return res.status(500).json({ error: "Failed to send nudge notification" });
  }
}

// Main handler that routes based on action parameter
export default async function handler(req, res) {
  const { action } = req.query;

  try {
    switch (action) {
      case "rank":
        return await handleRank(req, res);
      case "profile":
        return await handleProfile(req, res);
      case "nudge":
        return await handleNudge(req, res);
      default:
        return res.status(400).json({
          error: `Unknown action: ${action}. Valid actions: rank, profile, nudge`,
        });
    }
  } catch (error) {
    console.error("❌ Unexpected error in donors router:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
