"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface AppointmentRow {
  id: string;
  patient_id: string;
  date: string;
  donor_id?: string | null;
  donor_arrival?: string | null;
  patients?: {
    name: string;
    blood_group: string;
    phone: string;
  } | null;
}

interface Donor {
  id: string;
  name: string;
  blood_group?: string | null;
  available: boolean;
  next_available_date?: string;
}

interface PatientDonorLink {
  patient_id: string;
  donor_id: string;
  status: string;
}

interface RankedDonor {
  id: string;
  name: string;
  blood_group: string;
  distance_km: number;
  response_rate: number;
  completed_donations: number;
  cancellation_count: number;
  composite_score: number;
  donor_rank: number;
  confidence_level: "High" | "Medium" | "Low";
  score_explanation: string;
  ranking_breakdown: {
    reliability_score: string;
    distance_score: string;
    recency_score: string;
    penalty_bonus: string;
  };
}

interface AppointmentDetail {
  id: string;
  type: "patient";
  name: string;
  blood_group: string;
  phone: string;
  patient_id: string;
  date?: string;
  donor_id?: string;
  donor_name?: string;
  donor_arrival?: string;
  rankedDonors?: RankedDonor[];
}

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
}

export default function AppointmentDetailModal({
  isOpen,
  onClose,
  date,
}: AppointmentDetailModalProps) {
  const backendApiBaseUrl =
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || "http://localhost:3000";
  const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [selectedDonor, setSelectedDonor] = useState<Record<string, string>>(
    {},
  );
  const [loadingRanks, setLoadingRanks] = useState<Record<string, boolean>>({});

  const canDonorDonateToPatient = (
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

    const donorAbo = donor[1] as "A" | "B" | "AB" | "O";
    const donorRh = donor[2] as "+" | "-";
    const patientAbo = patient[1] as "A" | "B" | "AB" | "O";
    const patientRh = patient[2] as "+" | "-";

    const compatibilityMap: Record<
      "A" | "B" | "AB" | "O",
      Array<"A" | "B" | "AB" | "O">
    > = {
      O: ["O", "A", "B", "AB"],
      A: ["A", "AB"],
      B: ["B", "AB"],
      AB: ["AB"],
    };

    const aboOk = compatibilityMap[donorAbo].includes(patientAbo);
    const rhOk = donorRh === "-" ? true : patientRh === "+";
    return aboOk && rhOk;
  };

  const isDonorAvailableForDate = (donor: Donor, appointmentDate: string) => {
    if (!donor.available) return false;
    if (!donor.next_available_date) return true;
    return donor.next_available_date <= appointmentDate;
  };

  // ✅ Fetch ranked donors for an appointment
  const fetchRankedDonors = useCallback(
    async (appt: AppointmentDetail): Promise<RankedDonor[]> => {
      try {
        setLoadingRanks((prev) => ({ ...prev, [appt.id]: true }));

        const rankUrls = [
          `${backendApiBaseUrl}/api/donors/rank?appointment_id=${appt.id}&limit=10`,
          `/api/donors/rank?appointment_id=${appt.id}&limit=10`,
        ];

        for (const url of rankUrls) {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              continue;
            }

            const data = await response.json();
            return (data.ranked_donors as RankedDonor[]) || [];
          } catch {
            // Try next URL fallback.
          }
        }

        // Fallback: show approved linked donors even when ranking endpoint is unavailable.
        const { data: linkRows, error: linkError } = await supabase
          .from("patient_donor_links")
          .select("patient_id, donor_id, status")
          .eq("patient_id", appt.patient_id)
          .eq("status", "approved");

        if (linkError) {
          console.error("Error fetching linked donors fallback:", linkError);
          return [];
        }

        const linkedDonorIds = ((linkRows || []) as PatientDonorLink[])
          .map((row) => row.donor_id)
          .filter(Boolean);

        if (linkedDonorIds.length === 0) {
          return [];
        }

        const { data: linkedDonorsData, error: linkedDonorsError } =
          await supabase
            .from("donor")
            .select("id, name, blood_group, available, next_available_date")
            .in("id", linkedDonorIds)
            .eq("available", true);

        if (linkedDonorsError) {
          console.error(
            "Error fetching donor records fallback:",
            linkedDonorsError,
          );
          return [];
        }

        const compatibleLinkedDonors = ((linkedDonorsData || []) as Donor[])
          .filter(
            (donor) =>
              canDonorDonateToPatient(donor.blood_group, appt.blood_group) &&
              isDonorAvailableForDate(donor, appt.date),
          )
          .sort((a, b) => a.name.localeCompare(b.name));

        return compatibleLinkedDonors.map((donor, index) => ({
          id: donor.id,
          name: donor.name,
          blood_group: donor.blood_group || "-",
          distance_km: 0,
          response_rate: 0,
          completed_donations: 0,
          cancellation_count: 0,
          composite_score: 0,
          donor_rank: index + 1,
          confidence_level: "Low",
          score_explanation: "Linked compatible donor (fallback mode)",
          ranking_breakdown: {
            reliability_score: "0",
            distance_score: "0",
            recency_score: "0",
            penalty_bonus: "0",
          },
        }));
      } catch (error) {
        console.error("Error in fetchRankedDonors:", error);
        return [];
      } finally {
        setLoadingRanks((prev) => ({ ...prev, [appt.id]: false }));
      }
    },
    [backendApiBaseUrl],
  );

  // ✅ Typed and memoized fetch function
  const fetchAppointments = useCallback(async () => {
    if (!date) return;

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
      id,
      patient_id,
      date,
      donor_id,
      donor_arrival,
      patients(name,blood_group,phone)
    `,
      )
      .eq("date", date);

    if (error || !data) {
      console.error("Error fetching appointments:", error);
      return;
    }

    // Use unknown → safely cast to known shape
    const appointmentsData = (data as unknown as AppointmentRow[]).map((a) => ({
      id: a.id,
      patient_id: a.patient_id,
      date: a.date,
      donor_id: a.donor_id,
      donor_arrival: a.donor_arrival,
      patients: a.patients
        ? {
            name: a.patients.name,
            blood_group: a.patients.blood_group,
            phone: a.patients.phone,
          }
        : null,
    }));

    // Collect donor IDs
    const donorIds = appointmentsData
      .filter((a) => Boolean(a.donor_id))
      .map((a) => a.donor_id!) as string[];

    let donorData: Donor[] = [];
    if (donorIds.length > 0) {
      const { data: dData, error: dError } = await supabase
        .from("donor")
        .select("id,name,blood_group,available,next_available_date")
        .in("id", donorIds);

      if (dError) console.error("Error fetching donors:", dError);
      donorData = (dData ?? []) as Donor[];
    }

    const mapped: AppointmentDetail[] = appointmentsData.map((a) => {
      const donor = donorData.find((d) => d.id === a.donor_id);
      return {
        id: a.id,
        type: "patient",
        name: a.patients?.name ?? "Unknown",
        blood_group: a.patients?.blood_group ?? "-",
        phone: a.patients?.phone ?? "-",
        patient_id: a.patient_id,
        date: a.date,
        donor_id: a.donor_id ?? undefined,
        donor_name: donor?.name,
        donor_arrival: a.donor_arrival ?? undefined,
        rankedDonors: undefined,
      };
    });

    setAppointments(mapped);

    // Fetch ranked donors for all unassigned appointments
    mapped.forEach(async (appt) => {
      if (!appt.donor_id) {
        const ranked = await fetchRankedDonors(appt);
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === appt.id ? { ...a, rankedDonors: ranked } : a,
          ),
        );
      }
    });
  }, [date, fetchRankedDonors]);

  // ✅ Typed donors fetch - fetch all available donors for assignment
  const fetchDonors = useCallback(async () => {
    const { data, error } = await supabase
      .from("donor")
      .select("id,name,blood_group,available,next_available_date")
      .eq("available", true);

    if (error) console.error("Error fetching donors:", error);
    else setDonors((data as Donor[]) || []);
  }, []);

  // ✅ Properly include dependencies
  useEffect(() => {
    if (!isOpen) return;
    fetchAppointments();
    fetchDonors();
  }, [isOpen, date, fetchAppointments, fetchDonors]);

  // ✅ Typed assign function
  const assignDonor = async (appt: AppointmentDetail) => {
    const donorId = selectedDonor[appt.id];
    if (!donorId) return;

    const donor = donors.find((d) => d.id === donorId);
    if (!donor) return;

    const donorArrival = new Date(date!);
    donorArrival.setDate(donorArrival.getDate() - 4);
    // Format as DATE (YYYY-MM-DD) not timestamp
    const donorArrivalDate = donorArrival.toISOString().split("T")[0];

    // Primary behavior: assign donor and normalize status to Scheduled.
    let { error: apptError } = await supabase
      .from("appointments")
      .update({
        donor_id: donorId,
        donor_arrival: donorArrivalDate,
        status: "Scheduled",
      })
      .eq("id", appt.id);

    // Demo-safe fallback: if lifecycle guards block status transition
    // (for example declined/no-show reassignment), still allow donor assignment.
    if (apptError) {
      const retry = await supabase
        .from("appointments")
        .update({
          donor_id: donorId,
          donor_arrival: donorArrivalDate,
        })
        .eq("id", appt.id);
      apptError = retry.error;
    }

    if (apptError) {
      console.error("Error updating appointment:", {
        message: apptError.message,
        code: apptError.code,
        details: apptError.details,
        hint: apptError.hint,
      });
      return;
    }

    // ✅ Don't mark donor unavailable yet - wait for acceptance

    await fetchAppointments();
    await fetchDonors();
    setSelectedDonor((prev) => ({ ...prev, [appt.id]: "" }));
  };

  if (!isOpen || !date) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all">
        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-800">
            Appointments for {new Date(date).toLocaleDateString()}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 text-3xl font-light leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {appointments.length === 0 ? (
          <p className="mt-4 text-gray-500 italic">No appointments found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="p-4 rounded-lg border-l-4 bg-red-50 border-red-500"
              >
                <p className="font-extrabold text-lg text-red-700 mb-1">
                  Patient
                </p>
                <div className="text-sm text-gray-700">
                  <p>
                    <strong>Name:</strong> {appt.name}
                  </p>
                  <p>
                    <strong>Blood Group:</strong>{" "}
                    <span className="font-mono">{appt.blood_group}</span>
                  </p>
                  <p>
                    <strong>Phone:</strong> {appt.phone}
                  </p>

                  {appt.donor_id ? (
                    <>
                      <p>
                        <strong>Assigned Donor:</strong>{" "}
                        {appt.donor_name ?? "-"}
                      </p>
                      <p>
                        <strong>Donor Arrival:</strong>{" "}
                        {new Date(appt.donor_arrival!).toLocaleDateString()}
                      </p>
                    </>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {/* Show loading state or ranked donors */}
                      {loadingRanks[appt.id] ? (
                        <p className="text-xs text-slate-500 italic">
                          Calculating ranked donors...
                        </p>
                      ) : appt.rankedDonors && appt.rankedDonors.length > 0 ? (
                        <>
                          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                            Top Ranked Donors
                          </p>
                          <div className="space-y-2">
                            {appt.rankedDonors.map((rankedDonor) => (
                              <div
                                key={rankedDonor.id}
                                className={`p-3 rounded-lg border-l-4 transition-all cursor-pointer ${
                                  selectedDonor[appt.id] === rankedDonor.id
                                    ? "bg-indigo-100 border-indigo-500 border-2"
                                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                                }`}
                                onClick={() =>
                                  setSelectedDonor((prev) => ({
                                    ...prev,
                                    [appt.id]: rankedDonor.id,
                                  }))
                                }
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-bold text-sm text-gray-800">
                                      {rankedDonor.name}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      Blood: {rankedDonor.blood_group} | Rank:{" "}
                                      {rankedDonor.donor_rank} | Score:{" "}
                                      <span
                                        className={
                                          rankedDonor.composite_score >= 80
                                            ? "text-emerald-600 font-bold"
                                            : rankedDonor.composite_score >= 60
                                              ? "text-blue-600 font-bold"
                                              : "text-orange-600 font-bold"
                                        }
                                      >
                                        {rankedDonor.composite_score.toFixed(1)}
                                      </span>
                                      /100
                                    </p>
                                  </div>
                                  <span
                                    className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                                      rankedDonor.confidence_level === "High"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : rankedDonor.confidence_level ===
                                            "Medium"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-orange-100 text-orange-700"
                                    }`}
                                  >
                                    {rankedDonor.confidence_level}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-700 mt-1.5 line-clamp-2">
                                  {rankedDonor.score_explanation}
                                </p>
                              </div>
                            ))}
                          </div>
                          <button
                            aria-label={`Assign selected donor to ${appt.name}`}
                            className="w-full bg-indigo-600 text-white px-3 py-2.5 rounded-lg hover:bg-indigo-700 font-bold text-sm mt-3 disabled:opacity-50"
                            onClick={() => assignDonor(appt)}
                            disabled={!selectedDonor[appt.id]}
                          >
                            Assign Selected Donor
                          </button>
                        </>
                      ) : (
                        <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                          No approved linked donors found for this patient. Add
                          mapping in Directory.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
