/**
 * Unified Notifications Read/Update Router
 * Consolidates: unread-count.js, mark-read.js, timeline.js
 * 
 * Routes:
 * - GET ?action=unread-count (replaces /unread-count.js)
 * - PATCH ?action=mark-read (replaces /mark-read.js)
 * - GET ?action=timeline (replaces /timeline.js)
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// Unread count action: GET /api/notifications?action=unread-count
async function handleUnreadCount(req, res) {
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

    return res.status(200).json({
      success: true,
      unread_count: count || 0,
      role,
    });
  } catch (error) {
    console.error("❌ Error in unread-count action:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Mark read action: PATCH /api/notifications?action=mark-read
async function handleMarkRead(req, res) {
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
        return res.status(500).json({
          error: "Failed to bulk mark notifications as read",
        });
      }

      return res.status(200).json({
        success: true,
        mode: "bulk",
        message: "All notifications marked as read",
      });
    }

    return res
      .status(400)
      .json({
        error:
          "Provide either notification_id or mark_all=true with role details",
      });
  } catch (error) {
    console.error("❌ Error in mark-read action:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Timeline action: GET /api/notifications?action=timeline
async function handleTimeline(req, res) {
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

    const { data, error, count } = await query;

    if (error) {
      console.error("❌ Error fetching notification timeline:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch notification timeline" });
    }

    return res.status(200).json({
      success: true,
      notifications: data || [],
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset),
      unread_only: unread_only === "true",
    });
  } catch (error) {
    console.error("❌ Error in timeline action:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// Main handler that routes based on action parameter
export default async function handler(req, res) {
  const { action } = req.query;

  try {
    switch (action) {
      case "unread-count":
        if (req.method !== "GET") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        return await handleUnreadCount(req, res);
      case "mark-read":
        if (req.method !== "PATCH") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        return await handleMarkRead(req, res);
      case "timeline":
        if (req.method !== "GET") {
          return res.status(405).json({ error: "Method not allowed" });
        }
        return await handleTimeline(req, res);
      default:
        return res.status(400).json({
          error: `Unknown action: ${action}. Valid actions: unread-count, mark-read, timeline`,
        });
    }
  } catch (error) {
    console.error("❌ Unexpected error in notifications router:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
