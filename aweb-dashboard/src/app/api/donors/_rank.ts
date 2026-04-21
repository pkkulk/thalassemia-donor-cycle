import { supabase } from "@/lib/supabase";

type DonorRow = {
  id: string;
  name: string;
  blood_group: string | null;
  available: boolean | null;
  next_available_date: string | null;
  distance_km: number | null;
  response_rate: number | null;
  completed_donations: number | null;
  cancellation_count: number | null;
  recent_activity_days: number | null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const canDonate = (
  donorBloodGroup?: string | null,
  patientBloodGroup?: string | null,
) => {
  if (!donorBloodGroup || !patientBloodGroup) return false;
  const donor = donorBloodGroup
    .toUpperCase()
    .trim()
    .match(/^(AB|A|B|O)([+-])$/);
  const patient = patientBloodGroup
    .toUpperCase()
    .trim()
    .match(/^(AB|A|B|O)([+-])$/);
  if (!donor || !patient) return false;

  const compatibilityMap: Record<string, string[]> = {
    O: ["O", "A", "B", "AB"],
    A: ["A", "AB"],
    B: ["B", "AB"],
    AB: ["AB"],
  };

  const aboOk = compatibilityMap[donor[1]].includes(patient[1]);
  const rhOk = donor[2] === "-" ? true : patient[2] === "+";
  return aboOk && rhOk;
};

const isAvailableForDate = (donor: DonorRow, appointmentDate: string) => {
  if (!donor.available) return false;
  if (!donor.next_available_date) return true;
  return donor.next_available_date <= appointmentDate;
};

function computeScore(donor: DonorRow) {
  const responseRate = donor.response_rate || 0;
  const reliability = responseRate * 0.4;

  const distance =
    donor.distance_km && donor.distance_km > 0
      ? Math.min((100 / donor.distance_km) * 100, 100) * 0.3
      : 50 * 0.3;

  const days = donor.recent_activity_days;
  const recency =
    days == null
      ? 50 * 0.2
      : days <= 30
        ? 100 * 0.2
        : days <= 60
          ? 80 * 0.2
          : 50 * 0.2;

  const cancelPenalty = Math.max(
    -50,
    -1 * (donor.cancellation_count || 0) * 10,
  );
  const completionBonus = Math.min(
    50,
    Math.floor((donor.completed_donations || 0) / 5) * 5,
  );

  const composite = clamp(
    reliability + distance + recency + cancelPenalty + completionBonus,
    0,
    100,
  );

  return {
    composite_score: Number(composite.toFixed(2)),
    ranking_breakdown: {
      reliability_score: reliability.toFixed(2),
      distance_score: distance.toFixed(2),
      recency_score: recency.toFixed(2),
      penalty_bonus: (cancelPenalty + completionBonus).toFixed(2),
    },
  };
}

export async function getRankedDonors(appointmentId: string, limit = 10) {
  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .select("id, patient_id, date, blood_group")
    .eq("id", appointmentId)
    .single();

  if (apptError || !appt) {
    return { status: 404, body: { error: "Appointment not found" } };
  }

  const { data: links, error: linkError } = await supabase
    .from("patient_donor_links")
    .select("donor_id")
    .eq("patient_id", appt.patient_id)
    .eq("status", "approved");

  if (linkError) {
    return { status: 500, body: { error: "Failed to fetch donor links" } };
  }

  const linkedDonorIds = (links || []).map((l) => l.donor_id).filter(Boolean);
  if (linkedDonorIds.length === 0) {
    return {
      status: 200,
      body: {
        appointment_id: appt.id,
        patient_id: appt.patient_id,
        appointment_date: appt.date,
        blood_group: appt.blood_group,
        ranked_donors: [],
        total_ranked: 0,
        generated_at: new Date().toISOString(),
      },
    };
  }

  const { data: donors, error: donorError } = await supabase
    .from("donor")
    .select(
      "id,name,blood_group,available,next_available_date,distance_km,response_rate,completed_donations,cancellation_count,recent_activity_days",
    )
    .in("id", linkedDonorIds);

  if (donorError) {
    return { status: 500, body: { error: "Failed to fetch donors" } };
  }

  const ranked = ((donors || []) as DonorRow[])
    .filter(
      (d) =>
        canDonate(d.blood_group, appt.blood_group) &&
        isAvailableForDate(d, appt.date),
    )
    .map((d) => {
      const scoring = computeScore(d);
      return {
        id: d.id,
        name: d.name,
        blood_group: d.blood_group || "-",
        distance_km: d.distance_km || 0,
        response_rate: d.response_rate || 0,
        completed_donations: d.completed_donations || 0,
        cancellation_count: d.cancellation_count || 0,
        recent_activity_days: d.recent_activity_days,
        composite_score: scoring.composite_score,
        ranking_breakdown: scoring.ranking_breakdown,
      };
    })
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, limit)
    .map((d, index) => ({
      ...d,
      donor_rank: index + 1,
      confidence_level:
        d.composite_score >= 80
          ? "High"
          : d.composite_score >= 60
            ? "Medium"
            : "Low",
      score_explanation:
        d.composite_score >= 80
          ? "Excellent - High acceptance rate, recent activity, minimal cancellations"
          : d.composite_score >= 60
            ? "Good - Reliable performer with moderate activity"
            : "Fair - Limited activity or recent cancellations",
    }));

  return {
    status: 200,
    body: {
      appointment_id: appt.id,
      patient_id: appt.patient_id,
      appointment_date: appt.date,
      blood_group: appt.blood_group,
      ranked_donors: ranked,
      total_ranked: ranked.length,
      generated_at: new Date().toISOString(),
    },
  };
}
