import { supabase } from "@/lib/supabase";

export async function getRetentionPayload() {
  const { data: donorStats, error: statsError } = await supabase
    .from("vw_donor_stats")
    .select(
      "id, name, donor_status, total_donations, days_since_donation, phone",
    );

  if (statsError) {
    throw statsError;
  }

  const rows = donorStats || [];
  const active = rows.filter((d) => d.donor_status === "active").length;
  const lowActivity = rows.filter(
    (d) => d.donor_status === "low_activity",
  ).length;
  const atRisk = rows.filter((d) => d.donor_status === "at_risk").length;
  const inactive = rows.filter((d) => d.donor_status === "inactive").length;
  const total = rows.length;
  const retentionRate =
    total > 0
      ? Number((((active + lowActivity + atRisk) / total) * 100).toFixed(1))
      : 0;

  const atRiskDonors = rows
    .filter((d) => d.donor_status === "at_risk")
    .sort((a, b) => (b.days_since_donation || 0) - (a.days_since_donation || 0))
    .slice(0, 10)
    .map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      total_donations: d.total_donations,
      days_since_donation: d.days_since_donation,
    }));

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentAchievements } = await supabase
    .from("donor_achievements")
    .select("donor_id, achievement_type, unlocked_at")
    .gte("unlocked_at", sevenDaysAgo.toISOString())
    .order("unlocked_at", { ascending: false })
    .limit(10);

  return {
    success: true,
    retention_metrics: {
      active,
      low_activity: lowActivity,
      at_risk: atRisk,
      inactive,
      total,
      retention_rate: retentionRate,
    },
    at_risk_donors: atRiskDonors,
    recent_achievements: recentAchievements || [],
  };
}
