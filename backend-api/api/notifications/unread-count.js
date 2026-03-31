/**
 * API: GET /api/notifications/unread-count
 * Purpose: Return unread notification count by recipient role and scope
 * Query params:
 *  - role: patient | donor | admin (required)
 *  - patient_id: UUID (required for patient role)
 *  - donor_id: UUID (required for donor role)
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { role, patient_id, donor_id } = req.query;

  if (!role || !["patient", "donor", "admin"].includes(role)) {
    return res
      .status(400)
      .json({ error: "Invalid role. Use patient, donor, or admin." });
  }

  if (role === "patient" && !patient_id) {
    return res
      .status(400)
      .json({ error: "patient_id is required for patient role" });
  }

  if (role === "donor" && !donor_id) {
    return res
      .status(400)
      .json({ error: "donor_id is required for donor role" });
  }

  try {
    let query = supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_role", role)
      .is("read_at", null);

    if (role === "patient") {
      query = query.eq("recipient_patient_id", patient_id);
    }

    if (role === "donor") {
      query = query.eq("recipient_donor_id", donor_id);
    }

    const { count, error } = await query;
    if (error) {
      console.error("❌ Error fetching unread count:", error);
      return res.status(500).json({ error: "Failed to fetch unread count" });
    }

    return res.status(200).json({ role, unread_count: count || 0 });
  } catch (error) {
    console.error("❌ Unexpected unread-count error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
