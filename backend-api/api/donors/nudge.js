/**
 * API: POST /api/donors/:donor_id/nudge
 * Purpose: Send nudge campaign to specific donor
 * Body: {
 *   campaign_type: 'inactive_60days' | 'thank_you' | 'monthly_reminder',
 *   custom_message?: string (optional override)
 * }
 */

import supabase from "../../utils/supabaseClient.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { donor_id } = req.query;
  const { campaign_type, custom_message } = req.body;

  if (!donor_id || !campaign_type) {
    return res.status(400).json({
      error: "Missing required fields: donor_id, campaign_type",
    });
  }

  const validCampaigns = [
    "first_donation",
    "milestone_5",
    "milestone_10",
    "milestone_50",
    "inactive_60days",
    "consistency_achievement",
    "thank_you",
    "monthly_reminder",
  ];

  if (!validCampaigns.includes(campaign_type)) {
    return res
      .status(400)
      .json({ error: `Invalid campaign_type: ${campaign_type}` });
  }

  try {
    // Call the send_nudge_notification function
    const { data, error } = await supabase.rpc("send_nudge_notification", {
      p_donor_id: donor_id,
      p_campaign_type: campaign_type,
      p_custom_message: custom_message || null,
    });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      nudge_id: data[0].nudge_id,
      notification_id: data[0].notification_id,
      message: data[0].message,
    });
  } catch (error) {
    console.error("❌ Error sending nudge:", error);
    return res.status(500).json({ error: "Failed to send nudge notification" });
  }
}
