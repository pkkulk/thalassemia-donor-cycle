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

function buildReminderMessage({
  name,
  appointmentDate,
  reminderType,
  isDonor,
}) {
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

export default async function handler(req, res) {
  try {
    if (req.method && req.method !== "POST" && req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!process.env.RESEND_API_KEY) {
      return res
        .status(204)
        .json({ message: "RESEND_API_KEY not set; reminders skipped" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const todayStr = toDateOnly(new Date());
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = toDateOnly(tomorrow);

    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("id, patient_id, donor_id, date, status")
      .in("date", [todayStr, tomorrowStr])
      .in("status", ["Scheduled", "Accepted", "Donated"]);

    if (apptError) throw apptError;

    if (!appointments || appointments.length === 0) {
      return res.status(200).json({
        message: "No due reminders",
        scanned: 0,
        sent: { patient: 0, donor: 0 },
      });
    }

    const patientIds = [
      ...new Set(appointments.map((a) => a.patient_id).filter(Boolean)),
    ];
    const donorIds = [
      ...new Set(appointments.map((a) => a.donor_id).filter(Boolean)),
    ];

    const [
      { data: patients, error: patientErr },
      { data: donors, error: donorErr },
    ] = await Promise.all([
      patientIds.length
        ? supabase
            .from("patients")
            .select("id, name, email")
            .in("id", patientIds)
        : Promise.resolve({ data: [], error: null }),
      donorIds.length
        ? supabase.from("donor").select("id, name, email").in("id", donorIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (patientErr) throw patientErr;
    if (donorErr) throw donorErr;

    const patientMap = new Map((patients || []).map((p) => [p.id, p]));
    const donorMap = new Map((donors || []).map((d) => [d.id, d]));

    let patientSent = 0;
    let donorSent = 0;

    for (const appt of appointments) {
      const reminderType = classifyReminderType(appt.date, todayStr);
      if (!reminderType) continue;

      const patient = patientMap.get(appt.patient_id);
      if (patient?.email) {
        const alreadySent = await hasReminderBeenSent(
          appt.id,
          "patient",
          reminderType,
        );

        if (!alreadySent) {
          const msg = buildReminderMessage({
            name: patient.name || "Patient",
            appointmentDate: appt.date,
            reminderType,
            isDonor: false,
          });

          const sendResult = await resend.emails.send({
            from: "Blood Bank <onboarding@resend.dev>",
            to: patient.email,
            subject: msg.subject,
            text: msg.text,
          });

          await logReminder({
            appointmentId: appt.id,
            recipientRole: "patient",
            recipientId: patient.id,
            recipientEmail: patient.email,
            reminderType,
            appointmentDate: appt.date,
            providerMessageId: sendResult?.data?.id,
            payload: {
              status: appt.status,
              targetDate: appt.date,
            },
          });

          patientSent += 1;
        }
      }

      if (appt.donor_id) {
        const donor = donorMap.get(appt.donor_id);
        if (donor?.email) {
          const alreadySent = await hasReminderBeenSent(
            appt.id,
            "donor",
            reminderType,
          );

          if (!alreadySent) {
            const msg = buildReminderMessage({
              name: donor.name || "Donor",
              appointmentDate: appt.date,
              reminderType,
              isDonor: true,
            });

            const sendResult = await resend.emails.send({
              from: "Blood Bank <onboarding@resend.dev>",
              to: donor.email,
              subject: msg.subject,
              text: msg.text,
            });

            await logReminder({
              appointmentId: appt.id,
              recipientRole: "donor",
              recipientId: donor.id,
              recipientEmail: donor.email,
              reminderType,
              appointmentDate: appt.date,
              providerMessageId: sendResult?.data?.id,
              payload: {
                status: appt.status,
                targetDate: appt.date,
              },
            });

            donorSent += 1;
          }
        }
      }
    }

    return res.status(200).json({
      message: "Due reminders processed",
      scanned: appointments.length,
      sent: {
        patient: patientSent,
        donor: donorSent,
      },
    });
  } catch (err) {
    console.error("Error in sendDueReminders:", err);
    return res.status(500).json({ error: err.message });
  }
}
