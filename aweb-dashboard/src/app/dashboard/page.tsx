"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import AppTopNav from "@/components/AppTopNav";
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
      .gte("donor_arrival", todayStr) // >= today
      .lt("donor_arrival", tomorrowStr); // < tomorrow

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
        `${backendApiBaseUrl}/api/dashboard/donor-retention`,
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
          .gte("donor_arrival", today)
          .lt("donor_arrival", tomorrow)
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
        `${backendApiBaseUrl}/api/donors/${donorId}/nudge`,
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        <AppTopNav active="dashboard" />

        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title={t("dashboard.stats.recipientsToday")}
            count={todayPatients.length}
            icon={<FaUserInjured className="text-blue-500" />}
            color="bg-blue-50"
          />
          <StatCard
            title={t("dashboard.stats.activeDonors")}
            count={todayDonors.length}
            icon={<FaHandsHelping className="text-red-500" />}
            color="bg-red-50"
          />
          <StatCard
            title={t("dashboard.stats.upcomingPipeline")}
            count={upcomingAppts.length}
            icon={<FaCalendarAlt className="text-emerald-500" />}
            color="bg-emerald-50"
          />
        </div>

        {/* Operations Snapshot - Compact Status Overview */}
        <div className="mb-8 p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-4">
            Operational Status Snapshot
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <OpsCountCard
              label="Scheduled"
              count={operationsSnapshot.scheduled}
              tone="slate"
            />
            <OpsCountCard
              label="Accepted"
              count={operationsSnapshot.accepted}
              tone="sky"
            />
            <OpsCountCard
              label="Donated"
              count={operationsSnapshot.donated}
              tone="emerald"
            />
            <OpsCountCard
              label="Completed"
              count={operationsSnapshot.completed}
              tone="indigo"
            />
            <OpsCountCard
              label="Declined"
              count={operationsSnapshot.declined}
              tone="rose"
            />
            <OpsCountCard
              label="⚠️ Attention"
              count={operationsSnapshot.attention}
              tone="amber"
            />
          </div>
        </div>

        <div className="mb-8 app-card-surface p-6 rounded-3xl">
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              Donor Retention Monitor
            </h3>
            <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              {retentionMetrics.retention_rate}% retained
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <OpsCountCard
              label="Active"
              count={retentionMetrics.active}
              tone="emerald"
            />
            <OpsCountCard
              label="Low Activity"
              count={retentionMetrics.low_activity}
              tone="sky"
            />
            <OpsCountCard
              label="At Risk"
              count={retentionMetrics.at_risk}
              tone="amber"
            />
            <OpsCountCard
              label="Inactive"
              count={retentionMetrics.inactive}
              tone="rose"
            />
            <OpsCountCard
              label="Total"
              count={retentionMetrics.total}
              tone="slate"
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Re-engage at-risk donors
            </p>
            {atRiskDonors.length === 0 ? (
              <EmptyState text="No at-risk donors right now. Great retention!" />
            ) : (
              atRiskDonors.slice(0, 5).map((donor) => (
                <div
                  key={donor.id}
                  className="p-4 rounded-2xl border border-amber-100 bg-amber-50/40 flex items-center justify-between gap-4 flex-wrap"
                >
                  <div>
                    <p className="font-bold text-slate-900">{donor.name}</p>
                    <p className="text-xs text-slate-600 mt-1">
                      {donor.total_donations} donations •{" "}
                      {donor.days_since_donation} days since last donation
                    </p>
                    <a
                      href={`tel:${donor.phone}`}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 mt-1"
                    >
                      <FaPhoneAlt size={10} /> {donor.phone}
                    </a>
                  </div>
                  <button
                    onClick={() => handleSendNudge(donor.id)}
                    disabled={nudgingDonorId === donor.id}
                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide bg-slate-900 text-white hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {nudgingDonorId === donor.id ? "Sending..." : "Send Nudge"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="app-card-surface p-6 rounded-3xl mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              {t("dashboard.queue.title")}
            </h2>
            <a
              href="/health"
              className="text-sm font-bold text-red-600 hover:text-red-700"
            >
              {t("dashboard.queue.viewHealth")} →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionQueueCard
              title={t("dashboard.queue.needAssignment")}
              count={actionQueue.unassignedAppointments}
              href="/dashboard"
              cta={t("dashboard.queue.openCalendar")}
            />
            <ActionQueueCard
              title={t("dashboard.queue.needPatientPool")}
              count={actionQueue.patientsWithoutApprovedLinks}
              href="/directory"
              cta={t("dashboard.queue.assignMappings")}
            />
            <ActionQueueCard
              title={t("dashboard.queue.needDonorPool")}
              count={actionQueue.donorsWithoutApprovedLinks}
              href="/directory"
              cta={t("dashboard.queue.mapDonorPatient")}
            />
          </div>
        </div>

        {/* Master Schedule Calendar */}
        <div className="mb-8 p-8 app-card-surface rounded-[2rem]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tighter">
              <FaCalendarAlt className="text-red-500" /> Operational Master
              Schedule
            </h3>
            <div className="hidden sm:flex gap-4 text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-2 text-slate-400 italic">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>{" "}
                Unassigned
              </div>
              <div className="flex items-center gap-2 text-slate-400 italic">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>{" "}
                Partial
              </div>
              <div className="flex items-center gap-2 text-slate-400 italic">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>{" "}
                All Assigned
              </div>
            </div>
          </div>

          <div className="w-full">
            <CalendarWithAppointments
              appointmentDates={appointmentDates}
              dateStatus={dateStatus}
              initialDate={new Date().toISOString()}
              onDateClick={(date) => {
                setSelectedDate(date);
                setIsModalOpen(true);
              }}
            />
          </div>
        </div>

        {/* Today's Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Recipients Section */}
          <div className="app-card-surface p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-slate-800">
                Recipients Today
              </h2>
              <span className="text-[10px] bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase font-black">
                Priority
              </span>
            </div>
            <div className="space-y-4">
              {todayPatients.length === 0 ? (
                <EmptyState text="No patients registered today." />
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

          {/* Donors Section */}
          <div className="app-card-surface p-6 rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-slate-800">
                Arriving Donors
              </h2>
              <span className="text-[10px] bg-red-100 text-red-700 px-3 py-1 rounded-full uppercase font-black">
                Active
              </span>
            </div>
            <div className="space-y-4">
              {todayDonors.length === 0 ? (
                <EmptyState text="No donors arriving today." />
              ) : (
                todayDonors.map((d) => {
                  console.log(
                    `👨‍⚕️ Donor ${d.name}: status="${d.status}", can mark donated=${d.status === "Accepted"}`,
                  );
                  return (
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
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Section */}
        <div className="app-card-surface p-8 rounded-3xl">
          <h2 className="text-xl font-extrabold text-slate-800 mb-8 flex items-center gap-3 uppercase tracking-tighter">
            <FaClock className="text-emerald-500" /> Upcoming Operations
            Pipeline
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingAppts.map((appt) => (
              <div
                key={appt.id}
                className="p-5 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col justify-between group hover:border-red-200 transition-all cursor-default"
              >
                <div className="flex justify-between items-start mb-4">
                  <p className="font-bold text-slate-800 group-hover:text-red-600 transition-colors">
                    {appt.patient_name}
                  </p>
                  <span className="text-[10px] font-black bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-red-600 shadow-sm flex items-center gap-1">
                    <FaTint size={8} /> {appt.blood_group}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <FaClock className="text-slate-400" />
                  <span>
                    {new Date(appt.date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {/* Calendar actions removed from web dashboard - moved to mobile app after donor assignment */}
              </div>
            ))}
          </div>
        </div>
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
function StatCard({ title, count, icon, color }: StatCardProps) {
  return (
    <div className="app-card-surface p-6 rounded-3xl flex items-center justify-between transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
          {title}
        </p>
        <p className="text-3xl font-black text-slate-900 leading-none">
          {count}
        </p>
      </div>
      <div className={`p-4 ${color} rounded-2xl`}>{icon}</div>
    </div>
  );
}

function OpsCountCard({ label, count, tone }: OpsCountCardProps) {
  const toneClasses: Record<OpsCountCardProps["tone"], string> = {
    slate: "bg-slate-100 text-slate-700 border-slate-300",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-300",
    rose: "bg-rose-100 text-rose-700 border-rose-300",
    sky: "bg-sky-100 text-sky-700 border-sky-300",
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-300",
    amber: "bg-amber-100 text-amber-700 border-amber-300",
  };

  return (
    <div
      className={`p-3 rounded-lg border text-center transition-all hover:shadow-md ${toneClasses[tone]}`}
    >
      <p className="text-2xl font-black leading-none mb-1">{count}</p>
      <p className="text-[11px] font-bold uppercase tracking-tight">{label}</p>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl">
      <FaExclamationCircle className="mb-3 text-slate-100" size={40} />
      <p className="text-slate-400 text-sm font-medium italic">{text}</p>
    </div>
  );
}

function ActionQueueCard({
  title,
  count,
  href,
  cta,
}: {
  title: string;
  count: number;
  href: string;
  cta: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="text-3xl font-black text-slate-900 mt-2 mb-3">{count}</p>
      <a
        href={href}
        className="text-sm font-bold text-red-600 hover:text-red-700"
      >
        {cta} →
      </a>
    </div>
  );
}
