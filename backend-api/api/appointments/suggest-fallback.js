/**
 * API: POST /api/appointments/suggest-fallback
 * Purpose: Generate fallback donor/date suggestions for declined or missed appointments
 * Body: { appointment_id: string }
 * Response: Top 3 donors + top 3 alternative dates with recommendations
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { appointment_id } = req.body;

  if (!appointment_id) {
    return res.status(400).json({ error: "Missing appointment_id in body" });
  }

  try {
    console.log(
      `🔄 Generating fallback suggestions for appointment: ${appointment_id}`,
    );

    // Step 1: Fetch original appointment
    const { data: originalAppt, error: apptError } = await supabase
      .from("appointments")
      .select("id, patient_id, date, status, reschedule_count, donor_id")
      .eq("id", appointment_id)
      .single();

    if (apptError || !originalAppt) {
      console.error("❌ Appointment not found:", apptError);
      return res.status(404).json({ error: "Appointment not found" });
    }

    // Check if appointment can be rescheduled
    if (!["Declined", "NoShow"].includes(originalAppt.status)) {
      return res.status(400).json({
        error: `Appointment status is "${originalAppt.status}". Only Declined or NoShow can be rescheduled.`,
      });
    }

    if (originalAppt.reschedule_count >= 3) {
      return res.status(400).json({
        error: `Appointment has been rescheduled ${originalAppt.reschedule_count} times. Max 3 reschedules allowed.`,
      });
    }

    console.log(
      `📋 Original appointment: Status=${originalAppt.status}, Reschedules=${originalAppt.reschedule_count}`,
    );

    // Step 2: Call PostgreSQL function to get suggestions
    const { data: suggestions, error: suggestionError } = await supabase.rpc(
      "get_fallback_suggestions",
      {
        p_original_appointment_id: appointment_id,
        p_max_donors: 3,
        p_max_dates: 3,
      },
    );

    if (suggestionError) {
      console.error("❌ Error getting suggestions:", suggestionError);
      return res.status(500).json({ error: "Failed to generate suggestions" });
    }

    // Step 3: Organize suggestions by type
    const donors = suggestions
      .filter((s) => s.fallback_type === "donor")
      .map((s, idx) => ({
        rank: idx + 1,
        value: s.fallback_value,
        recommendation: s.recommendation_reason,
      }));

    const dates = suggestions
      .filter((s) => s.fallback_type === "date")
      .map((s, idx) => ({
        rank: idx + 1,
        value: s.fallback_value,
        recommendation: s.recommendation_reason,
      }));

    console.log(
      `✅ Generated ${donors.length} donor suggestions + ${dates.length} date suggestions`,
    );

    return res.status(200).json({
      appointment_id,
      original_status: originalAppt.status,
      reschedule_count: originalAppt.reschedule_count,
      original_date: originalAppt.date,
      suggested_donors: donors,
      suggested_dates: dates,
      recommendation_message:
        originalAppt.status === "Declined"
          ? "Donor declined appointment. Showing top alternatives for quick reassignment."
          : "Donor no-show. System auto-generated fallback options.",
      next_step:
        "POST /api/appointments/create-fallback with suggested donor_id and date",
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "❌ Unexpected error in /api/appointments/suggest-fallback:",
      error,
    );
    return res.status(500).json({ error: "Internal server error" });
  }
}
