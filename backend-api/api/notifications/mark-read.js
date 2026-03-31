/**
 * API: PATCH /api/notifications/mark-read
 * Purpose: Mark one notification as read OR bulk mark by recipient scope
 * Body options:
 *  1) { notification_id: uuid }
 *  2) { role: patient|donor|admin, patient_id?, donor_id?, mark_all: true }
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default async function handler(req, res) {
  if (req.method !== "PATCH") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { notification_id, role, patient_id, donor_id, mark_all } = req.body;

  try {
    if (notification_id) {
      const { data, error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notification_id)
        .is("read_at", null)
        .select("id")
        .single();

      if (error) {
        console.error("❌ Error marking notification as read:", error);
        return res
          .status(500)
          .json({ error: "Failed to mark notification as read" });
      }

      return res.status(200).json({
        success: true,
        mode: "single",
        notification_id: data?.id || notification_id,
      });
    }

    if (mark_all === true) {
      if (!role || !["patient", "donor", "admin"].includes(role)) {
        return res
          .status(400)
          .json({ error: "Invalid role for bulk mark-read" });
      }

      let query = supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_role", role)
        .is("read_at", null);

      if (role === "patient") {
        if (!patient_id) {
          return res
            .status(400)
            .json({ error: "patient_id is required for patient role" });
        }
        query = query.eq("recipient_patient_id", patient_id);
      }

      if (role === "donor") {
        if (!donor_id) {
          return res
            .status(400)
            .json({ error: "donor_id is required for donor role" });
        }
        query = query.eq("recipient_donor_id", donor_id);
      }

      const { error } = await query;
      if (error) {
        console.error("❌ Error bulk marking notifications as read:", error);
        return res
          .status(500)
          .json({ error: "Failed to mark notifications as read" });
      }

      return res.status(200).json({
        success: true,
        mode: "bulk",
        role,
      });
    }

    return res.status(400).json({
      error:
        "Provide either notification_id or { mark_all: true, role, patient_id/donor_id }",
    });
  } catch (error) {
    console.error("❌ Unexpected mark-read error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
