/**
 * API: POST /api/appointments/create-fallback
 * Purpose: Create a fallback appointment from suggestion
 * Body: { original_appointment_id, donor_id, date, reason }
 * Response: New fallback appointment details
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

  const { original_appointment_id, donor_id, date, reason } = req.body;

  // Validate required fields
  if (!original_appointment_id || !donor_id || !date) {
    return res.status(400).json({
      error: "Missing required fields: original_appointment_id, donor_id, date",
    });
  }

  try {
    console.log(
      `🔄 Creating fallback appointment: Original=${original_appointment_id}, Donor=${donor_id}, Date=${date}`,
    );

    // Step 1: Validate original appointment
    const { data: originalAppt, error: apptError } = await supabase
      .from("appointments")
      .select("id, date, status, reschedule_count")
      .eq("id", original_appointment_id)
      .single();

    if (apptError || !originalAppt) {
      return res.status(404).json({ error: "Original appointment not found" });
    }

    if (originalAppt.reschedule_count >= 3) {
      return res.status(400).json({
        error: "Appointment has reached max rescheduling limit (3)",
      });
    }

    // Step 2: Validate donor exists and is available
    const { data: donor, error: donorError } = await supabase
      .from("donor")
      .select("id, name, available")
      .eq("id", donor_id)
      .single();

    if (donorError || !donor) {
      return res.status(404).json({ error: "Donor not found" });
    }

    if (!donor.available) {
      return res
        .status(400)
        .json({ error: `Donor ${donor.name} is not currently available` });
    }

    // Step 3: Call PostgreSQL function to create fallback
    const { data: fallbackData, error: fallbackError } = await supabase.rpc(
      "create_fallback_appointment",
      {
        p_original_appointment_id: original_appointment_id,
        p_fallback_date: date,
        p_suggested_donor_id: donor_id,
        p_reason: reason || "donor_declined_via_fallback",
      },
    );

    if (fallbackError) {
      console.error("❌ Error creating fallback appointment:", fallbackError);
      return res
        .status(500)
        .json({ error: "Failed to create fallback appointment" });
    }

    console.log(`✅ Fallback appointment created: ${fallbackData}`);

    // Step 4: Fetch created appointment details
    const { data: newAppt, error: newApptError } = await supabase
      .from("appointments")
      .select(
        `
        id,
        patient_id,
        date,
        donor_id,
        status,
        original_appointment_id,
        reschedule_reason,
        reschedule_count,
        created_at
      `,
      )
      .eq("id", fallbackData)
      .single();

    if (newApptError) {
      console.error("❌ Error fetching new appointment:", newApptError);
      return res
        .status(500)
        .json({ error: "Appointment created but retrieval failed" });
    }

    return res.status(201).json({
      success: true,
      fallback_appointment: {
        id: newAppt.id,
        original_appointment_id: newAppt.original_appointment_id,
        patient_id: newAppt.patient_id,
        donor_id: newAppt.donor_id,
        donor_name: donor.name,
        original_date: originalAppt.date || "N/A", // From original
        new_date: newAppt.date,
        status: newAppt.status,
        reschedule_reason: newAppt.reschedule_reason,
        reschedule_count: newAppt.reschedule_count,
        created_at: newAppt.created_at,
      },
      message: `Fallback appointment created for ${donor.name} on ${newAppt.date}. Reschedule count: ${newAppt.reschedule_count}/3.`,
      next_action:
        "Donor will receive notification email. Monitor status from admin dashboard.",
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      "❌ Unexpected error in /api/appointments/create-fallback:",
      error,
    );
    return res.status(500).json({ error: "Internal server error" });
  }
}
