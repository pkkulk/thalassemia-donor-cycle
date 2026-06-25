/**
 * Unified Notifications Send Router
 * Consolidates: sendDueReminders.js, sendReminderEmail.js, sendDonorEmail.js
 * 
 * Routes:
 * - POST ?action=send-due-reminders (replaces /sendDueReminders.js)
 * - POST ?action=send-reminder-email (replaces /sendReminderEmail.js)
 * - POST ?action=send-donor-email (replaces /sendDonorEmail.js)
 * 
 * Also used by cron job: /api/notifications/send?action=send-due-reminders
 */

import { Resend } from "resend";
import supabase from "../../utils/supabaseClient.js";

const REMINDER_TYPES = {
  DAY_BEFORE: "DAY_BEFORE",
  SAME_DAY: "SAME_DAY",
};

function toDateOnly(date) {
  return date.toISOString().split("T")[0];
}

function classifyReminderType(appointmentDateStr, todayStr) {
  const appointmentDate = new Date(`${appointmentDateStr}T00:00:00.000Z`);
  const today = new Date(`${todayStr}T00:00:00.000Z`);
  const diffMs = appointmentDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return REMINDER_TYPES.DAY_BEFORE;
  if (diffDays === 0) return REMINDER_TYPES.SAME_DAY;
  return null;
}

async function hasReminderBeenSent(appointmentId, recipientRole, reminderType) {
  const { data, error } = await supabase
    .from("reminder_logs")
    .select("id")
    .eq("appointment_id", appointmentId)
    .eq("recipient_role", recipientRole)
    .eq("reminder_type", reminderType)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function logReminder({
  appointmentId,
  recipientRole,
  recipientId,
  recipientEmail,
  reminderType,
  appointmentDate,
  providerMessageId,
  payload,
}) {
  const { error } = await supabase.from("reminder_logs").insert({
    appointment_id: appointmentId,
    recipient_role: recipientRole,
    recipient_id: recipientId || null,
    recipient_email: recipientEmail || null,
    reminder_type: reminderType,
    appointment_date: appointmentDate,
    provider: "resend",
    provider_message_id: providerMessageId || null,
    payload,
  });

  if (error && error.code !== "23505") {
    throw error;
  }
}

function buildReminderMessage({ name, appointmentDate, reminderType, isDonor }) {
  const timingText =
    reminderType === REMINDER_TYPES.DAY_BEFORE ? "tomorrow" : "today";

  if (isDonor) {
    return {
      subject: `Reminder: Donation appointment ${timingText}`,
      text: `Hi ${name}, this is a reminder that your donation appointment is ${timingText} (${appointmentDate}). Thank you for your support.`,
    };
  }

  return {
    subject: `Reminder: Transfusion appointment ${timingText}`,
    text: `Hi ${name}, this is a reminder that your transfusion appointment is ${timingText} (${appointmentDate}).`,
  };
}

// Send due reminders action: POST /api/notifications/send?action=send-due-reminders
async function handleSendDueReminders(req, res) {
  if (!process.env.RESEND_API_KEY) {
    return res
      .status(204)
      .json({ message: "RESEND_API_KEY not set; reminders skipped" });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const todayStr = toDateOnly(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = toDateOnly(tomorrow);

    // Find appointments due for reminders
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("id, patient_id, donor_id, date, patients(name), donor(name)")
      .in("date", [todayStr, tomorrowStr]);

    if (apptError) throw apptError;
    if (!appointments || appointments.length === 0) {
      return res.status(200).json({ message: "No reminders to send today" });
    }

    let sentCount = 0;

    for (const appt of appointments) {
      const reminderType = classifyReminderType(appt.date, todayStr);
      if (!reminderType) continue;

      // Send to patient
      if (appt.patient_id && appt.patients) {
        const alreadySent = await hasReminderBeenSent(
          appt.id,
          "patient",
          reminderType,
        );

        if (!alreadySent) {
          const { subject, text } = buildReminderMessage({
            name: appt.patients.name,
            appointmentDate: appt.date,
            reminderType,
            isDonor: false,
          });

          const result = await resend.emails.send({
            from: "Blood Bank <no-reply@yourdomain.com>",
            to: appt.patients.email || "patient@example.com",
            subject,
            text,
          });

          await logReminder({
            appointmentId: appt.id,
            recipientRole: "patient",
            recipientId: appt.patient_id,
            recipientEmail: appt.patients.email,
            reminderType,
            appointmentDate: appt.date,
            providerMessageId: result.id,
            payload: { subject, text },
          });

          sentCount++;
        }
      }

      // Send to donor
      if (appt.donor_id && appt.donor) {
        const alreadySent = await hasReminderBeenSent(
          appt.id,
          "donor",
          reminderType,
        );

        if (!alreadySent) {
          const { subject, text } = buildReminderMessage({
            name: appt.donor.name,
            appointmentDate: appt.date,
            reminderType,
            isDonor: true,
          });

          const result = await resend.emails.send({
            from: "Blood Bank <no-reply@yourdomain.com>",
            to: appt.donor.email || "donor@example.com",
            subject,
            text,
          });

          await logReminder({
            appointmentId: appt.id,
            recipientRole: "donor",
            recipientId: appt.donor_id,
            recipientEmail: appt.donor.email,
            reminderType,
            appointmentDate: appt.date,
            providerMessageId: result.id,
            payload: { subject, text },
          });

          sentCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sent ${sentCount} reminder emails`,
      count: sentCount,
    });
  } catch (error) {
    console.error("❌ Error in send-due-reminders action:", error);
    return res.status(500).json({ error: error.message });
  }
}

// Send reminder email action: POST /api/notifications/send?action=send-reminder-email
async function handleSendReminderEmail(req, res) {
  if (!process.env.RESEND_API_KEY) {
    return res
      .status(204)
      .json({ message: "RESEND_API_KEY not set; email skipped" });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(today.getDate() + 1); // one day before donation
    const formattedDate = reminderDate.toISOString().split("T")[0];

    // Find tomorrow's appointments
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("donor_id, date")
      .eq("date", formattedDate);

    if (apptError) throw apptError;
    if (!appointments || appointments.length === 0)
      return res.status(200).json({ message: "No reminders to send today" });

    const donorIds = appointments.map((a) => a.donor_id).filter(Boolean);

    const { data: donors, error: donorError } = await supabase
      .from("donor")
      .select("name, email")
      .in("id", donorIds);

    if (donorError) throw donorError;

    let sentCount = 0;
    for (const donor of donors) {
      await resend.emails.send({
        from: "Blood Bank <no-reply@yourdomain.com>",
        to: donor.email,
        subject: "Reminder: Blood Donation Tomorrow",
        text: `Hi ${donor.name}, this is a reminder for your blood donation scheduled on ${formattedDate}. Thank you for being a lifesaver!`,
      });
      sentCount++;
    }

    return res
      .status(200)
      .json({ success: true, message: `Sent ${sentCount} reminder emails` });
  } catch (err) {
    console.error("Error sending reminders:", err);
    return res.status(500).json({ error: err.message });
  }
}

// Send donor email action: POST /api/notifications/send?action=send-donor-email
async function handleSendDonorEmail(req, res) {
  if (!process.env.RESEND_API_KEY) {
    return res
      .status(204)
      .json({ message: "RESEND_API_KEY not set; email skipped" });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Supabase webhook payload has "record" containing new row or direct body params
    const { record, donorId, appointmentDate, donor_id, date } = req.body;

    const actualDonorId = donor_id || donorId || record?.donor_id;
    const actualDate = date || appointmentDate || record?.date;
    const appointmentId = record?.id;

    if (!actualDonorId) {
      return res
        .status(200)
        .json({ message: "No donor assigned yet, skipping email" });
    }

    // Fetch donor details from Supabase
    const { data: donor, error: donorError } = await supabase
      .from("donor")
      .select("name, email")
      .eq("id", actualDonorId)
      .single();

    if (donorError || !donor)
      throw donorError || new Error("Donor not found");

    // Send confirmation email via Resend
    await resend.emails.send({
      from: "Blood Bank <onboarding@resend.dev>",
      to: donor.email,
      subject: "Blood Donation Appointment Confirmed",
      text: `Hi ${donor.name},

Your blood donation appointment has been confirmed.

🩸 Appointment Date: ${actualDate}
📍 Appointment ID: ${appointmentId || "N/A"}

Thank you for supporting life-saving donations!`,
    });

    return res
      .status(200)
      .json({ success: true, message: `Email sent successfully to ${donor.email}` });
  } catch (error) {
    console.error("Error in send-donor-email action:", error);
    return res.status(500).json({ error: error.message });
  }
}

// Main handler that routes based on action parameter
export default async function handler(req, res) {
  const { action } = req.query;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    switch (action) {
      case "send-due-reminders":
        return await handleSendDueReminders(req, res);
      case "send-reminder-email":
        return await handleSendReminderEmail(req, res);
      case "send-donor-email":
        return await handleSendDonorEmail(req, res);
      default:
        return res.status(400).json({
          error: `Unknown action: ${action}. Valid actions: send-due-reminders, send-reminder-email, send-donor-email`,
        });
    }
  } catch (error) {
    console.error("❌ Unexpected error in notifications send router:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
