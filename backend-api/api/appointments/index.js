/**
 * Unified Appointments API Router
 * Consolidates: new.js, create-fallback.js, suggest-fallback.js, calendar.js
 * Keeps: intelligent.js (separate due to heavy computation)
 * 
 * Routes:
 * - POST ?action=create (replaces /new.js)
 * - POST ?action=create-fallback (replaces /create-fallback.js)
 * - POST ?action=suggest-fallback (replaces /suggest-fallback.js)
 * - GET ?action=calendar&appointment_id=xyz (replaces /calendar.js)
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// Create action: POST /api/appointments?action=create
async function handleCreate(req, res) {
  const { patientId, donorId, date } = req.body;

  try {
    const { data, error } = await supabase
      .from("appointments")
      .insert([{ patient_id: patientId, donor_id: donorId, date }])
      .select();

    if (error) throw error;

    // Call email API after insertion
    await fetch(`${process.env.VERCEL_URL}/api/notifications?action=send-donor-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ donorId, appointmentDate: date }),
    });

    return res
      .status(200)
      .json({ message: "Appointment created and email sent", data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

// Create fallback action: POST /api/appointments?action=create-fallback
async function handleCreateFallback(req, res) {
  const { original_appointment_id, donor_id, date, reason } = req.body;

  if (!original_appointment_id || !donor_id || !date) {
    return res.status(400).json({
      error:
        "Missing required fields: original_appointment_id, donor_id, date",
    });
  }

  try {
    console.log(
      `🔄 Creating fallback appointment: Original=${original_appointment_id}, Donor=${donor_id}, Date=${date}`,
    );

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

    const { data: newAppt, error: insertError } = await supabase
      .from("appointments")
      .insert([
        {
          patient_id: originalAppt.patient_id,
          donor_id,
          date,
          status: "Pending",
          reschedule_count: originalAppt.reschedule_count + 1,
          rescheduled_from: original_appointment_id,
          reschedule_reason: reason,
        },
      ])
      .select();

    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: "Rescheduled" })
      .eq("id", original_appointment_id);

    if (updateError) throw updateError;

    console.log(`✅ Fallback appointment created: ${newAppt[0].id}`);

    return res.status(201).json({
      success: true,
      original_appointment_id,
      new_appointment_id: newAppt[0].id,
      new_date: date,
      new_donor_id: donor_id,
      message: "Fallback appointment created successfully",
    });
  } catch (error) {
    console.error("❌ Error creating fallback appointment:", error);
    return res.status(500).json({ error: "Failed to create fallback appointment" });
  }
}

// Suggest fallback action: POST /api/appointments?action=suggest-fallback
async function handleSuggestFallback(req, res) {
  const { appointment_id } = req.body;

  if (!appointment_id) {
    return res.status(400).json({ error: "Missing appointment_id in body" });
  }

  try {
    console.log(
      `🔄 Generating fallback suggestions for appointment: ${appointment_id}`,
    );

    const { data: originalAppt, error: apptError } = await supabase
      .from("appointments")
      .select("id, patient_id, date, status, reschedule_count, donor_id")
      .eq("id", appointment_id)
      .single();

    if (apptError || !originalAppt) {
      console.error("❌ Appointment not found:", apptError);
      return res.status(404).json({ error: "Appointment not found" });
    }

    if (!["Declined", "NoShow"].includes(originalAppt.status)) {
      return res.status(400).json({
        error: `Appointment status is "${originalAppt.status}". Only Declined or NoShow can be rescheduled.`,
      });
    }

    if (originalAppt.reschedule_count >= 3) {
      return res.status(400).json({
        error: "Appointment has reached max rescheduling limit (3)",
      });
    }

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("id, blood_group")
      .eq("id", originalAppt.patient_id)
      .single();

    if (patientError || !patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    const { data: linkedDonors, error: linkError } = await supabase
      .from("patient_donor_links")
      .select("donor_id")
      .eq("patient_id", originalAppt.patient_id)
      .eq("status", "approved");

    if (linkError) throw linkError;

    const linkedDonorIds = linkedDonors.map((link) => link.donor_id);

    let donorQuery = supabase.from("vw_top_ranked_donors").select("*");

    if (linkedDonorIds.length > 0) {
      donorQuery = donorQuery.in("id", linkedDonorIds);
    }

    const { data: topDonors } = await donorQuery.limit(3);

    const today = new Date();
    const suggestedDates = [
      new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // +3 days
      new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // +7 days
      new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000), // +14 days
    ].map((d) => d.toISOString().split("T")[0]);

    console.log(`✅ Generated suggestions for appointment ${appointment_id}`);

    return res.status(200).json({
      success: true,
      original_appointment_id: appointment_id,
      original_date: originalAppt.date,
      rescheduled_from_status: originalAppt.status,
      available_donors: topDonors || [],
      suggested_dates: suggestedDates,
      message:
        "Select a donor and date below to create a fallback appointment",
    });
  } catch (error) {
    console.error("❌ Error generating fallback suggestions:", error);
    return res
      .status(500)
      .json({ error: "Failed to generate fallback suggestions" });
  }
}

// Calendar action: GET /api/appointments?action=calendar&appointment_id=xyz
async function handleCalendar(req, res) {
  const { appointment_id } = req.query;

  if (!appointment_id) {
    return res.status(400).json({ error: "Missing appointment_id" });
  }

  function toIcsDate(dateObj) {
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getUTCDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  function escapeIcsText(value = "") {
    return String(value)
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  }

  try {
    const { data: appt, error: apptError } = await supabase
      .from("appointments")
      .select("id, patient_id, donor_id, date, status")
      .eq("id", appointment_id)
      .single();

    if (apptError || !appt) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const [{ data: patient }, { data: donor }] = await Promise.all([
      supabase
        .from("patients")
        .select("name, blood_group")
        .eq("id", appt.patient_id)
        .single(),
      appt.donor_id
        ? supabase.from("donor").select("name").eq("id", appt.donor_id).single()
        : Promise.resolve({ data: null }),
    ]);

    const start = new Date(`${appt.date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const dtStamp = new Date();
    const dtStampText = `${dtStamp.getUTCFullYear()}${String(
      dtStamp.getUTCMonth() + 1,
    ).padStart(2, "0")}${String(dtStamp.getUTCDate()).padStart(2, "0")}T${String(
      dtStamp.getUTCHours(),
    ).padStart(2, "0")}${String(dtStamp.getUTCMinutes()).padStart(2, "0")}${String(
      dtStamp.getUTCSeconds(),
    ).padStart(2, "0")}Z`;

    const summary = `Blood Transfusion Appointment - ${patient?.name || "Patient"}`;
    const description = [
      "=== APPOINTMENT DETAILS ===",
      `Appointment ID: ${appt.id}`,
      `Date: ${appt.date}`,
      `Status: ${appt.status || "Scheduled"}`,
      patient ? `Patient: ${patient.name} (${patient.blood_group})` : "Patient: TBD",
      donor ? `Donor: ${donor.name}` : "Donor: TBD",
      "BloodBank Details: https://thalassemia-donor.app",
    ].join("\\n");

    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Thalassemia Donor Cycle//EN
BEGIN:VEVENT
UID:${appt.id}@thalassemia-donor.app
DTSTAMP:${dtStampText}
DTSTART;VALUE=DATE:${toIcsDate(start)}
SUMMARY:${escapeIcsText(summary)}
DESCRIPTION:${escapeIcsText(description)}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="appointment-${appt.id}.ics"`,
    );

    return res.status(200).send(ics);
  } catch (error) {
    console.error("❌ Error generating calendar file:", error);
    return res.status(500).json({ error: "Failed to generate calendar file" });
  }
}

// Main handler that routes based on action parameter
export default async function handler(req, res) {
  const { action } = req.query;

  try {
    switch (action) {
      case "create":
        return await handleCreate(req, res);
      case "create-fallback":
        return await handleCreateFallback(req, res);
      case "suggest-fallback":
        return await handleSuggestFallback(req, res);
      case "calendar":
        return await handleCalendar(req, res);
      default:
        return res.status(400).json({
          error: `Unknown action: ${action}. Valid actions: create, create-fallback, suggest-fallback, calendar`,
        });
    }
  } catch (error) {
    console.error("❌ Unexpected error in appointments router:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
