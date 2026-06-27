"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  pageVariants,
  itemVariants,
  cardVariants,
  heroVariants,
  listVariants,
  rowVariants,
  hoverLift,
  tapShrink,
} from "@/lib/motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcherInline } from "@/components/LanguageSwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import CalendarWithAppointments from "@/components/CalendarWithAppointments";
import AppointmentDetailModal from "@/components/AppointmentDetailModal";
import {
  FaClock,
  FaUserInjured,
  FaHandsHelping,
  FaPhoneAlt,
  FaCheckCircle,
  FaCalendarAlt,
  FaExclamationCircle,
  FaTint,
} from "react-icons/fa";

// --- Interfaces ---
interface Patient {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
  status?: string;
}
interface Donor {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
  status?: string;
}
interface UpcomingAppt {
  id: string;
  date: string;
  patient_name: string;
  blood_group: string;
}

interface AppointmentSummary {
  date: string;
  donor_id?: string | null;
}

interface ActionQueueCounts {
  unassignedAppointments: number;
  patientsWithoutApprovedLinks: number;
  donorsWithoutApprovedLinks: number;
}

interface OperationsSnapshot {
  scheduled: number;
  accepted: number;
  declined: number;
  donated: number;
  completed: number;
  attention: number;
}

interface RetentionMetrics {
  active: number;
  low_activity: number;
  at_risk: number;
  inactive: number;
  total: number;
  retention_rate: number;
}

interface AtRiskDonor {
  id: string;
  name: string;
  phone: string;
  total_donations: number;
  days_since_donation: number;
}

// FIXED: Defined interfaces for sub-components to remove TypeScript 'any' errors
interface StatCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  suffix?: string;
}

interface OpsCountCardProps {
  label: string;
  count: number;
  tone: "slate" | "emerald" | "rose" | "sky" | "indigo" | "amber";
}

interface PersonActionCardProps {
  name: string;
  group: string;
  phone: string;
  status: string;
  btnLabel: string;
  colorTheme: "red" | "blue";
  onAction?: () => void;
}

interface ActionQueueItem {
  id: string;
  initials: string;
  initialsTone: "rose" | "amber" | "indigo" | "sky";
  title: string;
  meta: string;
  badge: string;
  badgeTone: "rose" | "amber" | "emerald" | "neutral";
  href?: string;
  onClick?: () => void;
}

export default function Dashboard() {
  const { t } = useI18n();
  const backendApiBaseUrl =
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || "http://localhost:3000";
  const [appointmentDates, setAppointmentDates] = useState<string[]>([]);
  const [dateStatus, setDateStatus] = useState<
    Record<string, "unassigned" | "partial" | "assigned">
  >({});
  const [todayPatients, setTodayPatients] = useState<Patient[]>([]);
  const [todayDonors, setTodayDonors] = useState<Donor[]>([]);
  const [upcomingAppts, setUpcomingAppts] = useState<UpcomingAppt[]>([]);
  const [actionQueue, setActionQueue] = useState<ActionQueueCounts>({
    unassignedAppointments: 0,
    patientsWithoutApprovedLinks: 0,
    donorsWithoutApprovedLinks: 0,
  });
  const [operationsSnapshot, setOperationsSnapshot] =
    useState<OperationsSnapshot>({
      scheduled: 0,
      accepted: 0,
      declined: 0,
      donated: 0,
      completed: 0,
      attention: 0,
    });
  const [retentionMetrics, setRetentionMetrics] = useState<RetentionMetrics>({
    active: 0,
    low_activity: 0,
    at_risk: 0,
    inactive: 0,
    total: 0,
    retention_rate: 0,
  });
  const [atRiskDonors, setAtRiskDonors] = useState<AtRiskDonor[]>([]);
  const [nudgingDonorId, setNudgingDonorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchActionQueueData =
    useCallback(async (): Promise<ActionQueueCounts> => {
      const [
        { data: allAppointments },
        { data: allPatients },
        { data: allDonors },
        { data: approvedLinks },
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, donor_id, status, patient_id"),
        supabase.from("patients").select("id"),
        supabase.from("donor").select("id"),
        supabase
          .from("patient_donor_links")
          .select("patient_id, donor_id, status")
          .eq("status", "approved"),
      ]);

      const mappedPatientIds = new Set(
        (approvedLinks || [])
          .filter((link) => Boolean(link?.patient_id))
          .map((link) => link.patient_id),
      );
      const mappedDonorIds = new Set(
        (approvedLinks || [])
          .filter((link) => Boolean(link?.donor_id))
          .map((link) => link.donor_id),
      );

      return {
        unassignedAppointments:
          (allAppointments || []).filter(
            (appt) =>
              !appt.donor_id && !["Completed", "Donated"].includes(appt.status),
          ).length || 0,
        patientsWithoutApprovedLinks:
          (allPatients || []).filter(
            (patient) => !mappedPatientIds.has(patient.id),
          ).length || 0,
        donorsWithoutApprovedLinks:
          (allDonors || []).filter((donor) => !mappedDonorIds.has(donor.id))
            .length || 0,
      };
    }, []);

  const actionQueueQuery = useQuery({
    queryKey: ["dashboard-action-queue"],
    queryFn: fetchActionQueueData,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (actionQueueQuery.data) {
      setActionQueue(actionQueueQuery.data);
    }
  }, [actionQueueQuery.data]);

  const fetchData = useCallback(async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrowStr = new Date(new Date().setDate(new Date().getDate() + 1))
      .toISOString()
      .split("T")[0];

    // Fetch all appointments
    const { data: allAppointments, error } = await supabase
      .from("appointments")
      .select("*");
    if (error) console.error("Fetch Error:", error);

    // Get donors arriving TODAY using range query (handles both DATE and TIMESTAMP formats)
    const { data: todayDonorAppointments } = await supabase
      .from("appointments")
      .select("donor_id, status")
      .or(
        `and(donor_arrival.gte.${todayStr},donor_arrival.lt.${tomorrowStr}),date.eq.${todayStr}`,
      );

    // Fetch appointments scheduled for TODAY (patient appointment date)
    const { data: todayPatientAppointments } = await supabase
      .from("appointments")
      .select("patient_id, status, donor_completed_at")
      .eq("date", todayStr);

    setAppointmentDates(allAppointments?.map((a) => a.date) || []);

    // Compute date status (assigned, partial, or unassigned based on donor assignments)
    const statusByDate: Record<string, "unassigned" | "partial" | "assigned"> =
      {};
    if (allAppointments) {
      const groupedByDate: Record<string, AppointmentSummary[]> = {};
      allAppointments.forEach((appt) => {
        if (!groupedByDate[appt.date]) groupedByDate[appt.date] = [];
        groupedByDate[appt.date].push(appt);
      });

      Object.entries(groupedByDate).forEach(([date, appts]) => {
        const assignedCount = appts.filter((a) => a.donor_id).length;
        const totalCount = appts.length;
        if (assignedCount === 0) statusByDate[date] = "unassigned";
        else if (assignedCount === totalCount) statusByDate[date] = "assigned";
        else statusByDate[date] = "partial";
      });
    }
    setDateStatus(statusByDate);

    // Fetch Today's Details
    const patientIds = todayPatientAppointments?.map((a) => a.patient_id) || [];
    const uniquePatientIds = [...new Set(patientIds)]; // Remove duplicates
    const { data: patientsData } = await supabase
      .from("patients")
      .select("*")
      .in("id", uniquePatientIds);

    const donorIds =
      todayDonorAppointments?.map((a) => a.donor_id).filter(Boolean) || [];
    console.log(`🔍 Today's donor appointments:`, todayDonorAppointments);
    console.log(`🎯 Donor IDs arriving today:`, donorIds);
    const { data: donorsData } = await supabase
      .from("donor")
      .select("*")
      .in("id", donorIds);
    console.log(`👨‍⚕️ Donors fetched (${donorsData?.length || 0}):`, donorsData);

    setTodayPatients(
      (patientsData || []).map((p) => ({
        ...p,
        status:
          (todayPatientAppointments || []).find((a) => a?.patient_id === p.id)
            ?.status || "Pending",
      })),
    );

    setTodayDonors(
      (donorsData || []).map((d) => ({
        ...d,
        status:
          (todayDonorAppointments || []).find((a) => a?.donor_id === d.id)
            ?.status || "Pending",
      })),
    );

    // Fetch Upcoming Pipeline
    const future =
      allAppointments
        ?.filter((a) => a.date > todayStr)
        .sort((a, b) => a.date.localeCompare(b.date)) || [];
    const futurePatientIds = future.map((a) => a.patient_id);
    const { data: futurePatients } = await supabase
      .from("patients")
      .select("id, name, blood_group")
      .in("id", futurePatientIds);

    setUpcomingAppts(
      future.map((appt) => ({
        id: appt.id,
        date: appt.date,
        patient_name:
          futurePatients?.find((p) => p.id === appt.patient_id)?.name ||
          "Unknown Patient",
        blood_group:
          futurePatients?.find((p) => p.id === appt.patient_id)?.blood_group ||
          "N/A",
      })),
    );

    let allPatients: Array<{ id: string }> = [];
    let allDonors: Array<{ id: string }> = [];
    let approvedLinks: Array<{ patient_id: string; donor_id: string }> = [];

    try {
      const [allPatientsRes, allDonorsRes, approvedLinksRes] =
        await Promise.all([
          supabase.from("patients").select("id"),
          supabase.from("donor").select("id"),
          supabase
            .from("patient_donor_links")
            .select("patient_id, donor_id")
            .eq("status", "approved"),
        ]);

      allPatients = Array.isArray(allPatientsRes.data)
        ? (allPatientsRes.data as Array<{ id: string }>)
        : [];
      allDonors = Array.isArray(allDonorsRes.data)
        ? (allDonorsRes.data as Array<{ id: string }>)
        : [];
      approvedLinks = Array.isArray(approvedLinksRes.data)
        ? (approvedLinksRes.data as Array<{
          patient_id: string;
          donor_id: string;
        }>)
        : [];
    } catch (mappingFetchError) {
      console.error(
        "❌ Error fetching mapping snapshot for dashboard:",
        mappingFetchError,
      );
    }

    const mappedPatientIds = new Set(
      approvedLinks
        .filter((link) => Boolean(link?.patient_id))
        .map((link) => link.patient_id),
    );
    const mappedDonorIds = new Set(
      approvedLinks
        .filter((link) => Boolean(link?.donor_id))
        .map((link) => link.donor_id),
    );

    const unassignedAppointments =
      allAppointments?.filter(
        (appt) =>
          !appt.donor_id && !["Completed", "Donated"].includes(appt.status),
      ).length || 0;

    // Calculate Operations Snapshot
    const scheduled =
      allAppointments?.filter((a) => a.status === "Scheduled").length || 0;
    const accepted =
      allAppointments?.filter((a) => a.status === "Accepted").length || 0;
    const declined =
      allAppointments?.filter((a) => a.status === "Declined").length || 0;
    const donated =
      allAppointments?.filter((a) => a.status === "Donated").length || 0;
    const completed =
      allAppointments?.filter((a) => a.status === "Completed").length || 0;

    // Attention items: overdue unfinished appointments
    const today = new Date().toISOString().split("T")[0];
    const attention =
      allAppointments?.filter(
        (a) =>
          a.date < today &&
          !["Completed", "Donated", "Declined"].includes(a.status),
      ).length || 0;

    setOperationsSnapshot({
      scheduled,
      accepted,
      declined,
      donated,
      completed,
      attention,
    });

    setActionQueue({
      unassignedAppointments,
      patientsWithoutApprovedLinks: allPatients.filter(
        (patient) => !mappedPatientIds.has(patient.id),
      ).length,
      donorsWithoutApprovedLinks: allDonors.filter(
        (donor) => !mappedDonorIds.has(donor.id),
      ).length,
    });

    try {
      const retentionResponse = await fetch(
        `${backendApiBaseUrl}/api/dashboard?metric=retention`,
      );
      if (retentionResponse.ok) {
        const retentionData = await retentionResponse.json();
        if (retentionData?.retention_metrics) {
          setRetentionMetrics(retentionData.retention_metrics);
        }
        if (Array.isArray(retentionData?.at_risk_donors)) {
          setAtRiskDonors(retentionData.at_risk_donors);
        }
      }
    } catch (retentionError) {
      console.warn("Retention widget unavailable (backend not reachable)");
    }

    setLoading(false);
  }, [backendApiBaseUrl]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("realtime-appointments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        fetchData,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleDonation = async (donorId: string) => {
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const now = new Date().toISOString(); // Full timestamp
      const nextAvailableDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      console.log("🩸 Marking donation as Donated for donor:", donorId);

      // Find one concrete accepted appointment for this donor today.
      const { data: acceptedAppointments, error: acceptedFetchError } =
        await supabase
          .from("appointments")
          .select("id")
          .eq("donor_id", donorId)
          .eq("status", "Accepted")
          .or(
            `and(donor_arrival.gte.${today},donor_arrival.lt.${tomorrow}),date.eq.${today}`,
          )
          .limit(1);

      if (acceptedFetchError) {
        console.error("❌ Error finding accepted appointment:", {
          code: acceptedFetchError.code,
          message: acceptedFetchError.message,
          details: acceptedFetchError.details,
          hint: acceptedFetchError.hint,
        });
        return;
      }

      if (!acceptedAppointments || acceptedAppointments.length === 0) {
        console.warn(
          "No accepted appointment found for this donor today. Nothing marked as Donated.",
        );
        return;
      }

      const appointmentId = acceptedAppointments[0].id;

      // Prepare donor state so safety guards allow Donated transition.
      const { error: donorPreUpdateError } = await supabase
        .from("donor")
        .update({
          available: true,
          next_available_date: null,
        })
        .eq("id", donorId);

      if (donorPreUpdateError) {
        console.error("❌ Error preparing donor for donation transition:", {
          code: donorPreUpdateError.code,
          message: donorPreUpdateError.message,
          details: donorPreUpdateError.details,
          hint: donorPreUpdateError.hint,
        });
        return;
      }

      // Update only the selected appointment.
      const { error: apptError } = await supabase
        .from("appointments")
        .update({
          status: "Donated",
          donor_completed_at: now,
        })
        .eq("id", appointmentId);

      if (apptError) {
        console.error("❌ Error updating appointment:", {
          code: apptError.code,
          message: apptError.message,
          details: apptError.details,
          hint: apptError.hint,
        });
        return;
      }

      // Also update donor's last_donated field
      const { error: donorError } = await supabase
        .from("donor")
        .update({
          last_donated: today,
          available: false,
          next_available_date: nextAvailableDate,
        })
        .eq("id", donorId);

      if (donorError) {
        console.error("❌ Error updating donor last_donated:", donorError);
      } else {
        console.log("✅ Donation marked as Donated and last_donated updated");
      }

      fetchData();
    } catch (error) {
      console.error("❌ Error in handleDonation:", error);
    }
  };

  const handleCompletion = async (patientId: string) => {
    try {
      console.log("🔵 Starting handleCompletion for patient:", patientId);

      // Find the appointment that's currently in 'Donated' status for this patient
      const { data: appointments, error: apptFetchError } = await supabase
        .from("appointments")
        .select("id, donor_id, date, status")
        .eq("patient_id", patientId)
        .eq("status", "Donated");

      if (apptFetchError) {
        console.error("❌ Error fetching appointment:", apptFetchError);
        return;
      }

      if (!appointments || appointments.length === 0) {
        console.error(
          "❌ No Donated appointment found for patient:",
          patientId,
        );
        return;
      }

      const appointment = appointments[0];
      console.log("📋 Found Donated appointment:", appointment);

      // Just mark the specific appointment as completed (patient side)
      // Note: donor.last_donated was already updated when "Mark Donated" was clicked
      const now = new Date().toISOString(); // Full timestamp
      console.log(
        "🔄 Marking appointment",
        appointment.id,
        "as Completed for patient",
      );
      const { error: completeError } = await supabase
        .from("appointments")
        .update({
          status: "Completed",
          patient_completed_at: now,
        })
        .eq("id", appointment.id);

      if (completeError) {
        console.error(
          "❌ Error marking appointment as completed:",
          completeError,
        );
        return;
      } else {
        console.log("✅ Successfully marked appointment as Completed");
      }

      fetchData();
    } catch (error) {
      console.error("❌ Error completing donation:", error);
    }
  };

  const handleSendNudge = async (donorId: string) => {
    try {
      setNudgingDonorId(donorId);
      const response = await fetch(
        `${backendApiBaseUrl}/api/donors?action=nudge&donor_id=${donorId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaign_type: "inactive_60days" }),
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Failed to send nudge");
      }

      await fetchData();
    } catch (error) {
      console.error("❌ Error sending dashboard nudge:", error);
      alert("Could not send nudge right now. Please try again.");
    } finally {
      setNudgingDonorId(null);
    }
  };

  // Calendar functionality moved to mobile app (Feature 4 - Mobile)

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 font-bold uppercase tracking-widest animate-pulse">
        {t("dashboard.loading")}
      </div>
    );

  const completionRate =
    operationsSnapshot.scheduled > 0
      ? Math.round(
        ((operationsSnapshot.completed + operationsSnapshot.donated) /
          operationsSnapshot.scheduled) *
        100,
      )
      : 0;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

  const todayLabel = new Date().toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });

  const primaryPatient = todayPatients[0];
  const primaryDonor = todayDonors[0];
  const acceptedDonor = todayDonors.find(
    (donor) => donor.status === "Accepted",
  );
  const inactiveDonor = atRiskDonors[0];

  const queueItems: ActionQueueItem[] = [
    {
      id: "assign",
      initials: primaryPatient ? getInitials(primaryPatient.name) : "AQ",
      initialsTone: "rose",
      title: `Assign donor — ${primaryPatient?.name || "Pending patient"}`,
      meta: `Appointment · ${todayLabel} · ${primaryPatient?.blood_group || "N/A"}`,
      badge: actionQueue.unassignedAppointments > 0 ? "Assign" : "Review",
      badgeTone: "rose",
      href: "/directory?tab=mappings",
    },
    {
      id: "mapping",
      initials: primaryDonor ? getInitials(primaryDonor.name) : "MP",
      initialsTone: "amber",
      title: `Mapping pending — ${primaryDonor?.name || "Donor pool"}`,
      meta: `Mapping · ${Math.max(actionQueue.patientsWithoutApprovedLinks, 0)} patients await match`,
      badge: actionQueue.patientsWithoutApprovedLinks > 0 ? "Pending" : "Ready",
      badgeTone: "amber",
      href: "/directory?tab=mappings",
    },
    {
      id: "nudge",
      initials: inactiveDonor ? getInitials(inactiveDonor.name) : "ND",
      initialsTone: "indigo",
      title: `Donor inactive — ${inactiveDonor?.name || "Retention candidate"}`,
      meta: inactiveDonor
        ? `Last donated ${inactiveDonor.days_since_donation} days ago · Send nudge?`
        : "No critical inactivity in current snapshot",
      badge: nudgingDonorId && inactiveDonor ? "Sending" : "Nudge",
      badgeTone: "neutral",
      onClick: inactiveDonor
        ? () => handleSendNudge(inactiveDonor.id)
        : undefined,
    },
    {
      id: "accepted",
      initials: acceptedDonor ? getInitials(acceptedDonor.name) : "OK",
      initialsTone: "sky",
      title: `Appointment confirmed — ${acceptedDonor?.name || "Latest donor"}`,
      meta: `Appointment · ${todayLabel} · ${acceptedDonor?.blood_group || "N/A"} · ${acceptedDonor?.status || "Accepted"}`,
      badge: acceptedDonor ? "Accepted" : "Stable",
      badgeTone: "emerald",
      href: "/dashboard",
    },
  ];

  const urgentQueueCount = queueItems.filter(
    (item) => item.badgeTone === "rose" || item.badgeTone === "amber",
  ).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", color: "var(--color-text-primary)" }}>
      {/* ── TOP NAV ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "var(--color-background-primary)", borderBottom: "0.5px solid var(--color-border-secondary)", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", height: 52, padding: "0 20px" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", marginRight: 28, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: "var(--r-md)", background: "linear-gradient(135deg, #F03E5E, #C0193A)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 16 16" style={{ width: 16, height: 16, fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round" }}><path d="M8 2C8 2 4 5 4 9a4 4 0 008 0C12 5 8 2 8 2z" /></svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>Hemo<span style={{ color: "var(--cr-600)" }}>Link</span></span>
          </a>
          <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
            {[
              { href: "/dashboard", label: t("dashboard.nav.dashboard"), active: true },
              { href: "/directory", label: t("dashboard.nav.directory") },
              { href: "/stats", label: t("dashboard.nav.analytics") },
              { href: "/health", label: t("dashboard.nav.health") }
            ].map(l => (
              <a key={l.href} href={l.href} style={{ padding: "6px 12px", borderRadius: "var(--r-md)", fontSize: 13, color: l.active ? "var(--cr-600)" : "var(--color-text-secondary)", background: l.active ? "var(--cr-50)" : "transparent", fontWeight: l.active ? 500 : 400, textDecoration: "none", whiteSpace: "nowrap" }}>{l.label}</a>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", flexShrink: 0 }}>
            <LanguageSwitcherInline />
            <ThemeToggle inline />
            <button className="nav-btn" style={{ position: "relative" }} title="Notifications">🔔
              <span style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: "var(--cr-400)", border: "1.5px solid var(--color-background-primary)" }} />
            </button>
            <div style={{ width: 32, height: 32, borderRadius: "var(--r-full)", background: "var(--cr-100)", color: "var(--cr-800)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>AD</div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "calc(100vh - 52px)" }}>
        {/* Sidebar */}
        <aside style={{ background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-secondary)", padding: "16px 12px", position: "sticky", top: 52, height: "calc(100vh - 52px)", overflowY: "auto" }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-text-tertiary)", textTransform: "uppercase", padding: "12px 8px 6px" }}>{t("sidebar.overview")}</p>
          {[{ href: "/dashboard", icon: "◉", label: t("dashboard.nav.dashboard"), active: true, badge: null }, { href: "/directory", icon: "📋", label: t("dashboard.nav.directory"), active: false, badge: "3" }, { href: "/stats", icon: "📊", label: t("dashboard.nav.analytics"), active: false, badge: null }, { href: "/health", icon: "❤️", label: t("dashboard.nav.health"), active: false, badge: null }].map(l => (
            <a key={l.href} href={l.href} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: "var(--r-md)", color: l.active ? "var(--cr-600)" : "var(--color-text-secondary)", background: l.active ? "var(--cr-50)" : "transparent", fontWeight: l.active ? 500 : 400, fontSize: 13, marginBottom: 2, textDecoration: "none" }}>
              <span style={{ width: 16, fontSize: 14 }}>{l.icon}</span>{l.label}
              {l.badge && <span style={{ marginLeft: "auto", background: "var(--cr-400)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: "var(--r-full)" }}>{l.badge}</span>}
            </a>
          ))}
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "var(--color-text-tertiary)", textTransform: "uppercase", padding: "12px 8px 6px" }}>{t("sidebar.operations")}</p>
          {[{ href: "/dashboard", icon: "📅", label: t("sidebar.schedule") }, { href: "/directory?tab=mappings", icon: "🔗", label: t("sidebar.mappings"), badge: "2" }, { href: "/stats", icon: "📣", label: t("sidebar.nudges") }, { href: "/stats", icon: "🏆", label: t("sidebar.leaderboard") }].map(l => (
            <a key={l.label} href={l.href} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: "var(--r-md)", color: "var(--color-text-secondary)", fontSize: 13, marginBottom: 2, textDecoration: "none" }}>
              <span style={{ width: 16, fontSize: 14 }}>{l.icon}</span>{l.label}
              {(l as { badge?: string }).badge && <span style={{ marginLeft: "auto", background: "var(--cr-400)", color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: "var(--r-full)" }}>{(l as { badge?: string }).badge}</span>}
            </a>
          ))}
        </aside>

        <main style={{ padding: 24, overflowY: "auto" }}>
          <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="show"
          >
            {/* ── PAGE HEADER ── */}

            {/* ── STAT CARDS ── */}
            <motion.div
              variants={listVariants}
              style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}
            >
              {[
                { label: t("dashboard.stats.activeDonors"), value: retentionMetrics.active, delta: "▲ 12 this month", deltaUp: true, icon: "🩸", iconBg: "var(--cr-50)", numColor: "var(--cr-600)", topColor: "var(--cr-400)" },
                { label: t("dashboard.stats.upcomingPipeline"), value: operationsSnapshot.scheduled, delta: "→ Today", deltaUp: null, icon: "📅", iconBg: "var(--cb-50)", numColor: "var(--cb-600)", topColor: "var(--cb-400)" },
                { label: t("stats.metric.completionRate"), value: completionRate, suffix: "%", delta: "▲ vs last month", deltaUp: true, icon: "✓", iconBg: "var(--ct-50)", numColor: "var(--ct-600)", topColor: "var(--ct-400)" },
                { label: t("stats.kpi.atRiskDonors"), value: retentionMetrics.at_risk, delta: "▼ Needs attention", deltaUp: false, icon: "⚠", iconBg: "var(--cp-50)", numColor: "var(--cp-600)", topColor: "var(--cp-400)" },
              ].map((s) => (
                <motion.div
                  key={s.label}
                  variants={cardVariants}
                  whileHover={hoverLift}
                  whileTap={tapShrink}
                  style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--r-lg)", padding: "18px 20px", cursor: "pointer", position: "relative", overflow: "hidden" }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: s.topColor, borderRadius: "var(--r-lg) var(--r-lg) 0 0" }} />
                  <div style={{ position: "absolute", right: 16, top: 16, width: 36, height: 36, borderRadius: "var(--r-md)", background: s.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{s.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 10 }}>{s.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: s.numColor, marginBottom: 6 }}>{s.value}{s.suffix}</div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: "var(--r-full)", fontSize: 12, fontWeight: 500, background: s.deltaUp === true ? "var(--ct-50)" : s.deltaUp === false ? "var(--cr-50)" : "var(--cg-50)", color: s.deltaUp === true ? "var(--ct-800)" : s.deltaUp === false ? "var(--cr-800)" : "var(--cg-600)" }}>{s.delta}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* ── APPOINTMENT PIPELINE ── */}
            <motion.div
              variants={itemVariants}
              style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--r-lg)", padding: 20, marginBottom: 16 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{t("dashboard.pipeline.title")}</div>
                <a href="/stats" style={{ fontSize: 12, color: "var(--cb-600)", cursor: "pointer", textDecoration: "none" }}>View all →</a>
              </div>
              <motion.div
                variants={listVariants}
                style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0 }}
              >
                {[
                  { label: t("directory.appt.status.scheduled").toUpperCase(), val: operationsSnapshot.scheduled, c: "var(--cb-600)" },
                  { label: t("directory.appt.status.accepted").toUpperCase(), val: operationsSnapshot.accepted, c: "var(--ct-600)" },
                  { label: t("directory.appt.status.declined").toUpperCase(), val: operationsSnapshot.declined, c: "var(--ca-600)" },
                  { label: t("directory.appt.status.donated").toUpperCase(), val: operationsSnapshot.donated, c: "var(--cr-600)" },
                  { label: t("directory.appt.status.completed").toUpperCase(), val: operationsSnapshot.completed, c: "var(--cg-600)" },
                ].map((p, i) => (
                  <motion.div key={p.label} variants={rowVariants} style={{ flex: 1, textAlign: "center", padding: "10px 6px", borderRight: i < 4 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                    <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", color: p.c }}>{p.val}</div>
                    <div style={{ fontSize: 10, color: p.c, marginTop: 2, fontWeight: 500, letterSpacing: "0.02em" }}>{p.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <motion.div variants={cardVariants} whileHover={hoverLift} className="app-card-surface rounded-xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {t("dashboard.queue.title")}
                    <motion.span
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
                      className="ml-2 rounded-full bg-[#fff0f3] px-2 py-0.5 text-[11px] font-medium text-[#c0193a]"
                    >
                      {urgentQueueCount} urgent
                    </motion.span>
                  </h3>
                  <a href="/directory?tab=appointments" className="text-xs font-medium text-[#1a5cc8] hover:text-[#0d3278]">
                    All actions →
                  </a>
                </div>
                <motion.div variants={listVariants} className="space-y-2">
                  {queueItems.map((item) => (
                    <motion.div key={item.id} variants={rowVariants}>
                      <ActionQueueRow item={item} />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              <motion.div variants={cardVariants} whileHover={hoverLift} className="app-card-surface rounded-xl p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t("dashboard.masterSchedule")}</h3>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {actionQueueQuery.isFetching ? "Refreshing" : "Live"}
                  </span>
                </div>
                <CalendarWithAppointments
                  appointmentDates={appointmentDates}
                  dateStatus={dateStatus}
                  initialDate={new Date().toISOString()}
                  onDateClick={(date) => {
                    setSelectedDate(date);
                    setIsModalOpen(true);
                  }}
                />
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <motion.div variants={cardVariants} whileHover={hoverLift} className="app-card-surface rounded-xl p-5">
                <h3 className="mb-4 text-sm font-semibold">{t("dashboard.today")}</h3>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
                      {t("dashboard.stats.recipientsToday")}
                    </p>
                    <div className="space-y-3">
                      {todayPatients.length === 0 ? (
                        <EmptyState
                          text="No patients registered today."
                          compact
                        />
                      ) : (
                        todayPatients.map((p) => (
                          <PersonActionCard
                            key={p.id}
                            name={p.name}
                            group={p.blood_group}
                            phone={p.phone}
                            status={p.status || ""}
                            onAction={
                              p.status === "Donated"
                                ? () => handleCompletion(p.id)
                                : undefined
                            }
                            btnLabel="Mark Completed"
                            colorTheme="blue"
                          />
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
                      {t("directory.tab.donors")}
                    </p>
                    <div className="space-y-3">
                      {todayDonors.length === 0 ? (
                        <EmptyState text="No donors arriving today." compact />
                      ) : (
                        todayDonors.map((d) => (
                          <PersonActionCard
                            key={d.id}
                            name={d.name}
                            group={d.blood_group}
                            phone={d.phone}
                            status={d.status || ""}
                            onAction={
                              d.status === "Accepted"
                                ? () => handleDonation(d.id)
                                : undefined
                            }
                            btnLabel="Mark Donated"
                            colorTheme="red"
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={cardVariants} whileHover={hoverLift} className="app-card-surface rounded-xl p-5">
                <h3 className="mb-4 text-sm font-semibold">{t("sidebar.nudges")} Panel</h3>
                <motion.div variants={listVariants} className="space-y-2">
                  {atRiskDonors.length === 0 ? (
                    <EmptyState text="No at-risk donors right now." compact />
                  ) : (
                    atRiskDonors.slice(0, 5).map((donor) => (
                      <motion.div
                        key={donor.id}
                        variants={rowVariants}
                        whileHover={{ scale: 1.01 }}
                        whileTap={tapShrink}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: "var(--r-lg)", background: "var(--ca-50)", border: "0.5px solid var(--ca-100)", marginBottom: 8, cursor: "pointer" }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ca-600)", flexShrink: 0 }}></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text-primary)" }}>
                            {donor.name}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--ca-800)" }}>
                            {donor.days_since_donation} days inactive
                          </p>
                        </div>
                        <motion.button
                          onClick={() => handleSendNudge(donor.id)}
                          disabled={nudgingDonorId === donor.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="rounded-md bg-[#f03e5e] px-2.5 py-1 text-[11px] font-medium text-white hover:bg-[#c0193a] disabled:opacity-60"
                        >
                          {nudgingDonorId === donor.id ? "..." : "Nudge"}
                        </motion.button>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div variants={itemVariants} className="app-card-surface rounded-xl p-5">
              <h3 className="mb-4 text-sm font-semibold">Upcoming Pipeline</h3>
              <motion.div variants={listVariants} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {upcomingAppts.map((appt) => (
                  <motion.div
                    key={appt.id}
                    variants={cardVariants}
                    whileHover={hoverLift}
                    whileTap={tapShrink}
                    className="rounded-lg border border-[var(--border-1)] bg-[var(--surface-2)] p-3"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {appt.patient_name}
                      </p>
                      <span className="rounded-full bg-[#fff0f3] px-2 py-0.5 text-[10px] font-semibold text-[#a31237]">
                        {appt.blood_group}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(appt.date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>  {/* pageVariants wrapper */}
        </main>
      </div>
      <AppointmentDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate}
      />
    </div>
  );
}

// Sub-Components
function StatCard({ title, count, icon, color, suffix }: StatCardProps) {
  return (
    <motion.div
      className="app-card-surface p-5 rounded-2xl flex items-center justify-between transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
    >
      <div>
        <p className="text-[11px] font-bold text-[var(--text-subtle)] uppercase tracking-[0.12em] mb-1">
          {title}
        </p>
        <p className="text-[2rem] font-black text-slate-900 leading-none">
          {count}
          {suffix || ""}
        </p>
      </div>
      <div
        className={`p-3.5 ${color} rounded-xl border border-[var(--border-1)]`}
      >
        {icon}
      </div>
    </motion.div>
  );
}

function OpsCountCard({ label, count, tone }: OpsCountCardProps) {
  const toneClasses: Record<OpsCountCardProps["tone"], string> = {
    slate: "text-slate-600",
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    sky: "text-sky-700",
    indigo: "text-indigo-700",
    amber: "text-amber-700",
  };

  return (
    <div className="border-r border-[var(--border-1)] px-2 py-2 text-center last:border-r-0">
      <p
        className={`text-[36px] leading-none font-semibold ${toneClasses[tone]}`}
      >
        {count}
      </p>
      <p
        className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${toneClasses[tone]}`}
      >
        {label}
      </p>
    </div>
  );
}

function PersonActionCard({
  name,
  group,
  phone,
  status,
  btnLabel,
  colorTheme,
  onAction,
}: PersonActionCardProps) {
  const isDone = status === "Completed";
  const themeClasses =
    colorTheme === "red"
      ? "text-red-600 bg-red-50 border-red-100"
      : "text-blue-600 bg-blue-50 border-blue-100";

  return (
    <div
      className={`p-5 rounded-2xl border transition-all ${isDone ? "bg-slate-50 opacity-60 border-slate-200 shadow-none" : "bg-white shadow-sm border-slate-100 hover:border-slate-300"}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 leading-tight text-lg">
            {name}
          </h4>
          <div className="flex gap-3 mt-3">
            <span
              className={`text-[9px] font-black px-2.5 py-1 border rounded-lg ${themeClasses} flex items-center gap-1`}
            >
              <FaTint size={8} /> {group}
            </span>
            <a
              href={`tel:${phone}`}
              className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 hover:text-slate-700 transition-colors"
            >
              <FaPhoneAlt size={10} className="text-slate-300" /> {phone}
            </a>
          </div>
        </div>
        <div
          className={`status-pill ${isDone ? "status-pill--completed" : "status-pill--pending"}`}
        >
          {status}
        </div>
      </div>
      {onAction && !isDone && (
        <button
          onClick={onAction}
          className="w-full mt-5 py-3 bg-slate-900 text-white text-[10px] font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-slate-200 flex items-center justify-center gap-2 uppercase tracking-tighter"
        >
          <FaCheckCircle /> {btnLabel}
        </button>
      )}
    </div>
  );
}

function EmptyState({
  text,
  compact = false,
}: {
  text: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-1)] ${compact ? "py-6" : "py-12"}`}
    >
      <FaExclamationCircle
        className="mb-2 text-slate-300"
        size={compact ? 24 : 40}
      />
      <p
        className={`text-[var(--text-muted)] ${compact ? "text-xs" : "text-sm"}`}
      >
        {text}
      </p>
    </div>
  );
}

function ActionQueueRow({ item }: { item: ActionQueueItem }) {
  const initialsToneClasses: Record<ActionQueueItem["initialsTone"], string> = {
    rose: "bg-[#fff0f3] text-[#7a0e22]",
    amber: "bg-[#fff7eb] text-[#7a4d00]",
    indigo: "bg-[#f3eeff] text-[#2a1478]",
    sky: "bg-[#eef5ff] text-[#0d3278]",
  };

  const badgeToneClasses: Record<ActionQueueItem["badgeTone"], string> = {
    rose: "bg-[#f03e5e] text-white",
    amber: "bg-[#fff7eb] text-[#7a4d00]",
    emerald: "bg-[#e6f8f3] text-[#0f7a54]",
    neutral: "bg-transparent text-slate-800",
  };

  const rowContent = (
    <div className="flex items-center gap-3 rounded-md px-1 py-2 transition-colors hover:bg-[var(--surface-2)]">
      <div
        className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-[12px] font-semibold ${initialsToneClasses[item.initialsTone]}`}
      >
        {item.initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-slate-900">
          {item.title}
        </p>
        <p className="truncate text-[12px] text-[var(--text-muted)]">
          {item.meta}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-medium ${badgeToneClasses[item.badgeTone]}`}
      >
        {item.badge}
      </span>
    </div>
  );

  if (item.onClick) {
    return (
      <button onClick={item.onClick} className="w-full text-left">
        {rowContent}
      </button>
    );
  }

  if (item.href) {
    return <a href={item.href}>{rowContent}</a>;
  }

  return <div>{rowContent}</div>;
}
