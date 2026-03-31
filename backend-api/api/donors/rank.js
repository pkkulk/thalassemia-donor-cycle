/**
 * API: GET /api/donors/rank
 * Purpose: Return ranked list of donors for an appointment with composite scores
 * Query params: appointment_id (required), limit (optional, default 10)
 * Response: Array of donors sorted by composite_score DESC with ranking metadata
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { appointment_id, limit = 10 } = req.query;

  // Validate required params
  if (!appointment_id) {
    return res
      .status(400)
      .json({ error: "Missing required param: appointment_id" });
  }

  try {
    console.log(`📊 Ranking donors for appointment: ${appointment_id}`);

    // Step 1: Fetch the appointment to get patient details
    const { data: appointment, error: apptError } = await supabase
      .from("appointments")
      .select("patient_id, date, blood_group")
      .eq("id", appointment_id)
      .single();

    if (apptError || !appointment) {
      console.error("❌ Appointment not found:", apptError);
      return res.status(404).json({ error: "Appointment not found" });
    }

    console.log(
      `🩸 Patient blood group: ${appointment.blood_group}, Appointment date: ${appointment.date}`,
    );

    // Step 2: Fetch patient-donor links (approved only)
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

    // Step 3: Fetch top-ranked donors from view, limited to linked donors
    // Query the vw_top_ranked_donors view and filter by approved links
    let query = supabase.from("vw_top_ranked_donors").select("*");

    if (linkedDonorIds.length > 0) {
      query = query.in("id", linkedDonorIds);
    }

    const { data: rankedDonors, error: rankError } = await query.limit(limit);

    if (rankError) {
      console.error("❌ Error fetching ranked donors:", rankError);
      return res.status(500).json({ error: "Failed to fetch ranked donors" });
    }

    // Step 4: Enhance response with ranking info & confidence levels
    const enhancedDonors = rankedDonors.map((donor, index) => ({
      id: donor.id,
      name: donor.name,
      blood_group: donor.blood_group,
      distance_km: donor.distance_km,
      response_rate: donor.response_rate,
      completed_donations: donor.completed_donations,
      cancellation_count: donor.cancellation_count,
      composite_score: donor.composite_score,
      donor_rank: index + 1, // Rank in this result set
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
    console.error("❌ Unexpected error in /api/donors/rank:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
