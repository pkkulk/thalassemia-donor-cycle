/**
 * API: GET /api/notifications/timeline
 * Purpose: Fetch in-app notification timeline for patient/donor/admin
 * Query params:
 *  - role: patient | donor | admin (required)
 *  - patient_id: UUID (required for patient role)
 *  - donor_id: UUID (required for donor role)
 *  - unread_only: true | false (optional)
 *  - limit: number (optional, default 50)
 *  - offset: number (optional, default 0)
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

  const {
    role,
    patient_id,
    donor_id,
    unread_only = "false",
    limit = "50",
    offset = "0",
  } = req.query;

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
      .from("vw_notifications_timeline")
      .select("*")
      .eq("recipient_role", role)
      .order("created_at", { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (role === "patient") {
      query = query.eq("recipient_patient_id", patient_id);
    }

    if (role === "donor") {
      query = query.eq("recipient_donor_id", donor_id);
    }

    if (unread_only === "true") {
      query = query.is("read_at", null);
    }

    const { data, error } = await query;
    if (error) {
      console.error("❌ Error fetching notifications:", error);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }

    return res.status(200).json({
      role,
      total: data.length,
      unread_count: data.filter((n) => !n.read_at).length,
      notifications: data,
    });
  } catch (error) {
    console.error("❌ Unexpected timeline error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
