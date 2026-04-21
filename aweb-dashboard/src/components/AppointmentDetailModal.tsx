"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaCheckCircle, FaChevronRight, FaTimes, FaBolt } from "react-icons/fa";
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
  id: string | number;
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

const modalVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    y: 16,
    scale: 0.985,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] as const },
  },
};

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

  const canDonorDonateToPatient = useCallback(
    (donorBloodGroup?: string | null, patientBloodGroup?: string | null) => {
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
    },
    [],
  );

  const isDonorAvailableForDate = useCallback(
    (donor: Donor, appointmentDate: string) => {
      if (!donor.available) return false;
      if (!donor.next_available_date) return true;
      return donor.next_available_date <= appointmentDate;
    },
    [],
  );

  const parseScore = (value: string | number | null | undefined) => {
    if (typeof value === "number") return value;
    if (!value) return 0;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const scoreTone = (score: number) => {
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-100";
    if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-100";
    return "text-amber-700 bg-amber-50 border-amber-100";
  };

  const confidenceTone = (level: RankedDonor["confidence_level"]) => {
    if (level === "High")
      return "text-emerald-700 bg-emerald-50 border-emerald-100";
    if (level === "Medium") return "text-blue-700 bg-blue-50 border-blue-100";
    return "text-amber-700 bg-amber-50 border-amber-100";
  };

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
              (appt.date ? isDonorAvailableForDate(donor, appt.date) : false),
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
    [backendApiBaseUrl, canDonorDonateToPatient, isDonorAvailableForDate],
  );

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

  const fetchDonors = useCallback(async () => {
    const { data, error } = await supabase
      .from("donor")
      .select("id,name,blood_group,available,next_available_date")
      .eq("available", true);

    if (error) console.error("Error fetching donors:", error);
    else setDonors((data as Donor[]) || []);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchAppointments();
    fetchDonors();
  }, [isOpen, date, fetchAppointments, fetchDonors]);

  const assignDonor = async (appt: AppointmentDetail) => {
    const donorId = selectedDonor[appt.id];
    if (!donorId) return;

    const donor = donors.find((d) => d.id === donorId);
    if (!donor) return;

    const donorArrival = new Date(date!);
    donorArrival.setDate(donorArrival.getDate() - 4);
    const donorArrivalDate = donorArrival.toISOString().split("T")[0];

    let { error: apptError } = await supabase
      .from("appointments")
      .update({
        donor_id: donorId,
        donor_arrival: donorArrivalDate,
        status: "Scheduled",
      })
      .eq("id", appt.id);

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

    await fetchAppointments();
    await fetchDonors();
    setSelectedDonor((prev) => ({ ...prev, [appt.id]: "" }));
  };

  const modalAppointments = useMemo(() => appointments, [appointments]);

  if (!isOpen || !date) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[color:var(--surface-1)] shadow-[0_30px_80px_rgba(15,23,42,0.28)]"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--border-1)] bg-gradient-to-r from-[#fff0f3] via-white to-[#eef5ff] px-6 py-5 sm:px-7">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#ffd3de] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a31237]">
                <FaBolt className="text-[10px]" /> Ranked donor assignment
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--foreground)]">
                Appointments for {new Date(date).toLocaleDateString()}
              </h3>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Review the most compatible donors, inspect the score breakdown,
                and assign the best fit without leaving the modal.
              </p>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border-1)] bg-[color:var(--surface-1)] text-[color:var(--text-muted)] transition hover:-translate-y-0.5 hover:bg-[color:var(--surface-2)] hover:text-[color:var(--foreground)]"
              aria-label="Close"
            >
              <FaTimes />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            {modalAppointments.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--border-1)] bg-[color:var(--surface-2)] px-6 py-10 text-center text-[color:var(--text-muted)]">
                No appointments found.
              </div>
            ) : (
              <div className="space-y-4">
                {modalAppointments.map((appt, index) => (
                  (() => {
                    const apptId = String(appt.id);
                    const selectedRankedDonor = appt.rankedDonors?.find(
                      (donor) => donor.id === selectedDonor[appt.id],
                    );
                    return (
                  <motion.section
                    key={apptId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.22 }}
                    className="overflow-hidden rounded-[1.5rem] border border-[color:var(--border-1)] bg-[color:var(--surface-1)] shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--border-1)] bg-[color:var(--surface-2)] px-5 py-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">
                          Patient
                        </p>
                        <h4 className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">
                          {appt.name}
                        </h4>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[color:var(--text-muted)]">
                          <span className="rounded-full border border-[#d3e1ff] bg-[#eef5ff] px-3 py-1 font-medium text-[#0d4aa3]">
                            {appt.blood_group}
                          </span>
                          <span>{appt.phone}</span>
                          <span>Appointment #{apptId.slice(0, 8)}</span>
                        </div>
                      </div>
                      {appt.donor_id ? (
                        <div className="rounded-full border border-[#c7efd8] bg-[#e7f8ef] px-3 py-1 text-sm font-semibold text-[#0d6b43]">
                          Assigned donor: {appt.donor_name ?? "-"}
                        </div>
                      ) : (
                        <div className="rounded-full border border-[#ffe1b6] bg-[#fff7eb] px-3 py-1 text-sm font-semibold text-[#9a6208]">
                          {loadingRanks[apptId]
                            ? "Calculating ranking..."
                            : "Needs assignment"}
                        </div>
                      )}
                    </div>

                    <div className="p-5 sm:p-6">
                      {appt.donor_id ? (
                        <div className="grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
                          <div className="rounded-[1.25rem] border border-[color:var(--border-1)] bg-[color:var(--surface-2)] p-4">
                            <p className="text-sm font-medium text-[color:var(--foreground)]">
                              Donor confirmed
                            </p>
                            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                              {appt.donor_name ?? "-"}
                            </p>
                            {appt.donor_arrival ? (
                              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                                Donor arrival:{" "}
                                {new Date(
                                  appt.donor_arrival,
                                ).toLocaleDateString()}
                              </p>
                            ) : null}
                          </div>
                          <div className="rounded-[1.25rem] border border-[color:var(--border-1)] bg-[linear-gradient(180deg,#f3eeff,#ffffff)] p-4">
                            <p className="text-sm font-medium text-[#5633a9]">
                              This slot is already assigned.
                            </p>
                            <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                              The modal stays open for review and operational
                              context.
                            </p>
                          </div>
                        </div>
                      ) : appt.rankedDonors && appt.rankedDonors.length > 0 ? (
                        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                                Top ranked donors
                              </p>
                              <span className="text-xs text-[color:var(--text-muted)]">
                                {appt.rankedDonors.length} candidates
                              </span>
                            </div>

                            {appt.rankedDonors.map((rankedDonor) => {
                              const isSelected =
                                selectedDonor[appt.id] === rankedDonor.id;
                              const reliability = parseScore(
                                rankedDonor.ranking_breakdown.reliability_score,
                              );
                              const distance = parseScore(
                                rankedDonor.ranking_breakdown.distance_score,
                              );
                              const recency = parseScore(
                                rankedDonor.ranking_breakdown.recency_score,
                              );
                              const bonus = parseScore(
                                rankedDonor.ranking_breakdown.penalty_bonus,
                              );

                              return (
                                <motion.button
                                  key={rankedDonor.id}
                                  type="button"
                                  whileHover={{ y: -2 }}
                                  whileTap={{ scale: 0.99 }}
                                  onClick={() =>
                                    setSelectedDonor((prev) => ({
                                      ...prev,
                                      [appt.id]: rankedDonor.id,
                                    }))
                                  }
                                  className={`w-full rounded-[1.35rem] border p-4 text-left transition ${
                                    isSelected
                                      ? "border-[#7c5cea] bg-[#f3eeff] shadow-[0_10px_24px_rgba(124,92,234,0.16)]"
                                      : "border-[color:var(--border-1)] bg-[color:var(--surface-2)] hover:bg-white"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                                          {rankedDonor.name}
                                        </p>
                                        <span className="rounded-full border border-[color:var(--border-1)] bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                                          Rank {rankedDonor.donor_rank}
                                        </span>
                                      </div>
                                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[color:var(--text-muted)]">
                                        <span className="rounded-full bg-[#eef5ff] px-2.5 py-1 font-medium text-[#0d4aa3]">
                                          {rankedDonor.blood_group}
                                        </span>
                                        <span>
                                          {rankedDonor.distance_km.toFixed(1)}{" "}
                                          km away
                                        </span>
                                        <span>
                                          {Math.round(
                                            rankedDonor.response_rate,
                                          )}
                                          % response
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <span
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${confidenceTone(
                                          rankedDonor.confidence_level,
                                        )}`}
                                      >
                                        {rankedDonor.confidence_level}{" "}
                                        confidence
                                      </span>
                                      <div className="text-right text-2xl font-semibold tracking-tight text-[color:var(--foreground)]">
                                        {rankedDonor.composite_score.toFixed(1)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 space-y-2">
                                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">
                                      <span>Composite score</span>
                                      <span>
                                        {rankedDonor.composite_score.toFixed(1)}{" "}
                                        / 100
                                      </span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-[color:var(--surface-3)]">
                                      <motion.div
                                        className="h-full rounded-full bg-gradient-to-r from-[#f03e5e] via-[#4a8ef0] to-[#22b07a]"
                                        initial={{ width: 0 }}
                                        animate={{
                                          width: `${Math.max(0, Math.min(rankedDonor.composite_score, 100))}%`,
                                        }}
                                        transition={{
                                          duration: 0.45,
                                          ease: [0.16, 1, 0.3, 1] as const,
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="mt-4 grid gap-2 text-xs sm:grid-cols-4">
                                    {[
                                      ["Reliability", reliability],
                                      ["Distance", distance],
                                      ["Recency", recency],
                                      ["Penalty", bonus],
                                    ].map(([label, value]) => (
                                      <div
                                        key={label as string}
                                        className="rounded-2xl border border-[color:var(--border-1)] bg-white px-3 py-2"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="font-medium text-[color:var(--text-muted)]">
                                            {label}
                                          </span>
                                          <span className="font-semibold text-[color:var(--foreground)]">
                                            {Number.isFinite(value as number)
                                              ? (value as number).toFixed(1)
                                              : "0.0"}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  <p className="mt-4 text-sm leading-6 text-[color:var(--text-muted)]">
                                    {rankedDonor.score_explanation}
                                  </p>

                                  {isSelected ? (
                                    <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#7c5cea]">
                                      <FaCheckCircle /> Selected for assignment
                                    </div>
                                  ) : null}
                                </motion.button>
                              );
                            })}
                          </div>

                          <div className="space-y-4 rounded-[1.35rem] border border-[color:var(--border-1)] bg-[linear-gradient(180deg,#f9f6ff,#ffffff)] p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--text-subtle)]">
                              Candidate focus
                            </p>

                            {selectedRankedDonor ? (
                              <div className="space-y-4">
                                <div>
                                  <h5 className="text-xl font-semibold text-[color:var(--foreground)]">
                                    {selectedRankedDonor.name}
                                  </h5>
                                  <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                                    {selectedRankedDonor.blood_group} · Rank{" "}
                                    {selectedRankedDonor.donor_rank}
                                  </p>
                                </div>

                                <div
                                  className={`rounded-[1.2rem] border px-4 py-3 ${scoreTone(selectedRankedDonor.composite_score)}`}
                                >
                                  <div className="flex items-center justify-between text-sm font-semibold">
                                    <span>Composite score</span>
                                    <span>
                                      {selectedRankedDonor.composite_score.toFixed(1)} / 100
                                    </span>
                                  </div>
                                  <p className="mt-1 text-xs opacity-80">
                                    Confidence: {selectedRankedDonor.confidence_level}
                                  </p>
                                </div>

                                <div className="space-y-3">
                                  {[
                                    {
                                      label: "Reliability",
                                      value: parseScore(
                                        selectedRankedDonor.ranking_breakdown
                                          .reliability_score,
                                      ),
                                    },
                                    {
                                      label: "Distance",
                                      value: parseScore(
                                        selectedRankedDonor.ranking_breakdown
                                          .distance_score,
                                      ),
                                    },
                                    {
                                      label: "Recency",
                                      value: parseScore(
                                        selectedRankedDonor.ranking_breakdown
                                          .recency_score,
                                      ),
                                    },
                                    {
                                      label: "Penalty bonus",
                                      value: parseScore(
                                        selectedRankedDonor.ranking_breakdown
                                          .penalty_bonus,
                                      ),
                                    },
                                  ].map((item) => (
                                    <div key={item.label}>
                                      <div className="mb-1 flex items-center justify-between text-xs text-[color:var(--text-muted)]">
                                        <span>{item.label}</span>
                                        <span>{item.value.toFixed(1)}</span>
                                      </div>
                                      <div className="h-2 overflow-hidden rounded-full bg-[color:var(--surface-3)]">
                                        <motion.div
                                          className="h-full rounded-full bg-[#7c5cea]"
                                          initial={{ width: 0 }}
                                          animate={{
                                            width: `${Math.max(0, Math.min(item.value, 100))}%`,
                                          }}
                                          transition={{
                                            duration: 0.4,
                                            ease: [0.16, 1, 0.3, 1] as const,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="rounded-[1.2rem] border border-[color:var(--border-1)] bg-white p-4">
                                  <p className="text-sm font-medium text-[color:var(--foreground)]">
                                    Why this donor is recommended
                                  </p>
                                  <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
                                    {selectedRankedDonor.score_explanation}
                                  </p>
                                </div>

                                <button
                                  aria-label={`Assign selected donor to ${appt.name}`}
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f03e5e] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(240,62,94,0.25)] transition hover:-translate-y-0.5 hover:bg-[#c0193a] disabled:cursor-not-allowed disabled:opacity-50"
                                  onClick={() => assignDonor(appt)}
                                  disabled={!selectedDonor[appt.id]}
                                >
                                  Assign selected donor <FaChevronRight />
                                </button>
                              </div>
                            ) : (
                              <div className="rounded-[1.2rem] border border-dashed border-[color:var(--border-1)] bg-white px-4 py-3 text-sm text-[color:var(--text-muted)]">
                                {loadingRanks[apptId]
                                  ? "Calculating donor ranking..."
                                  : "Select a donor to preview the score composition, see the confidence rationale, and enable assignment."}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          No approved linked donors found for this patient. Add
                          mapping in Directory.
                        </div>
                      )}
                    </div>
                  </motion.section>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
