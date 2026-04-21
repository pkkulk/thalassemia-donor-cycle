/**
 * Unified API Router - Consolidates all endpoints into one serverless function
 * This handles routing for all analytics, donors, appointments, notifications, and dashboard endpoints
 */

import supabase from "../utils/supabaseClient.js";
import { Resend } from "resend";

let resend;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

function setCORS(res) {
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

// ========== ANALYTICS HANDLERS ==========
async function getAnalyticsSummary() {
  const { data: summary } = await supabase
    .from("vw_analytics_summary")
    .select("*")
    .single();

  const { data: trends } = await supabase
    .from("vw_appointment_trends")
    .select("*");

  const { data: donorCohorts } = await supabase
    .from("vw_donor_cohorts")
    .select("*");

  const { data: patientCohorts } = await supabase
    .from("vw_patient_cohorts")
    .select("*");

  return {
    success: true,
    summary,
    trends,
    donor_cohorts: donorCohorts || [],
    patient_cohorts: patientCohorts || [],
  };
}

async function getAnalyticsSupplyDemand() {
  const { data: bloodGroups } = await supabase
    .from("vw_blood_group_distribution")
    .select("*");

  const { data: topDemand } = await supabase
    .from("vw_top_blood_groups_demand")
    .select("*")
    .limit(10);

  const shortages = (bloodGroups || []).filter(
    (bg) =>
      bg.supply_status === "Supply shortage" ||
      bg.supply_status === "Tight supply",
  );

  return {
    success: true,
    blood_groups: bloodGroups || [],
    top_demand: topDemand || [],
    shortage_alerts: shortages,
    shortage_count: shortages.length,
  };
}

async function getAnalyticsBottlenecks() {
  const { data: bottlenecks } = await supabase
    .from("vw_appointment_bottlenecks")
    .select("*");

  const { data: completionMetrics } = await supabase
    .from("vw_appointment_completion_metrics")
    .select("*");

  return {
    success: true,
    bottlenecks: bottlenecks || [],
    completion_metrics: completionMetrics || [],
  };
}

// ========== DONORS HANDLERS ==========
async function getDonorsRank(appointmentId, limit = 10) {
  const { data: appointment, error: apptError } = await supabase
    .from("appointments")
    .select("patient_id, date, blood_group")
    .eq("id", appointmentId)
    .single();

  if (apptError || !appointment) {
    throw new Error("Appointment not found");
  }

  // Build response using your existing logic
  return { success: true, ranked_donors: [] };
}

async function getDonorsProfile(donorId) {
  const { data: donor } = await supabase
    .from("donor")
    .select("*")
    .eq("id", donorId)
    .single();

  return { success: true, donor };
}

// ========== APPOINTMENTS HANDLERS ==========
async function postAppointmentsNew(patientId, donorId, date) {
  const { data } = await supabase
    .from("appointments")
    .insert([{ patient_id: patientId, donor_id: donorId, date }])
    .select();

  return {
    success: true,
    message: "Appointment created",
    data,
  };
}

async function getAppointmentsCalendar(patientId, date) {
  const { data } = await supabase
    .from("appointments")
    .select("*")
    .eq("patient_id", patientId)
    .eq(date, "date");

  return { success: true, appointments: data };
}

// ========== NOTIFICATIONS HANDLERS ==========
async function postNotificationsSendDonorEmail(donorId, appointmentDate) {
  if (!resend) {
    return { message: "RESEND_API_KEY not set; email skipped" };
  }

  const { data: donor } = await supabase
    .from("donor")
    .select("name, email")
    .eq("id", donorId)
    .single();

  if (!donor) throw new Error("Donor not found");

  await resend.emails.send({
    from: "Blood Bank <onboarding@resend.dev>",
    to: donor.email,
    subject: "Blood Donation Appointment Confirmed",
    text: `Hi ${donor.name},\n\nYour blood donation appointment has been confirmed.\n\n🩸 Appointment Date: ${appointmentDate}\n\nThank you for supporting life-saving donations!`,
  });

  return { message: `Email sent to ${donor.email}` };
}

async function getNotificationsUnreadCount(userId) {
  const { data: count, error } = await supabase
    .from("in_app_notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("read", false);

  return { success: true, unread_count: count || 0 };
}

// ========== DASHBOARD HANDLERS ==========
async function getDashboardDonorRetention() {
  const { data } = await supabase.from("donor_retention_nudges").select("*");

  return { success: true, retention_data: data };
}

// Main router
export default async function handler(req, res) {
  setCORS(res);

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const path = req.query.route ? req.query.route.join("/") : "";
    const [domain, endpoint] = path.split("/");

    let result;

    // ANALYTICS routes
    if (domain === "analytics") {
      if (endpoint === "summary") {
        result = await getAnalyticsSummary();
      } else if (endpoint === "supply-demand") {
        result = await getAnalyticsSupplyDemand();
      } else if (endpoint === "bottlenecks") {
        result = await getAnalyticsBottlenecks();
      }
    }
    // DONORS routes
    else if (domain === "donors") {
      if (endpoint === "rank" && req.method === "GET") {
        result = await getDonorsRank(req.query.appointment_id, req.query.limit);
      } else if (endpoint === "profile" && req.method === "GET") {
        result = await getDonorsProfile(req.query.donor_id);
      }
    }
    // APPOINTMENTS routes
    else if (domain === "appointments") {
      if (endpoint === "new" && req.method === "POST") {
        const { patientId, donorId, date } = req.body;
        result = await postAppointmentsNew(patientId, donorId, date);
      } else if (endpoint === "calendar" && req.method === "GET") {
        result = await getAppointmentsCalendar(
          req.query.patient_id,
          req.query.date,
        );
      }
    }
    // NOTIFICATIONS routes
    else if (domain === "notifications") {
      if (endpoint === "sendDonorEmail" && req.method === "POST") {
        const { donorId, appointmentDate } = req.body;
        result = await postNotificationsSendDonorEmail(
          donorId,
          appointmentDate,
        );
      } else if (endpoint === "unread-count" && req.method === "GET") {
        result = await getNotificationsUnreadCount(req.query.user_id);
      }
    }
    // DASHBOARD routes
    else if (domain === "dashboard") {
      if (endpoint === "donor-retention" && req.method === "GET") {
        result = await getDashboardDonorRetention();
      }
    }

    if (!result) {
      return res.status(404).json({ error: `Endpoint /${path} not found` });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
