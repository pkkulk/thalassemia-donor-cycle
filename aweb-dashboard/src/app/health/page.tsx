"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import AdminShell from "@/components/AdminShell";
import {
  FaHeartbeat,
  FaLink,
  FaClipboardList,
  FaExclamationTriangle,
  FaUsers,
  FaHandsHelping,
  FaSpinner,
} from "react-icons/fa";

interface HealthStats {
  approvedMappings: number;
  pendingMappings: number;
  inactiveMappings: number;
  unassignedAppointments: number;
  incompatibleAttempts: number | null;
  patientsWithoutApprovedLinks: number;
  donorsWithoutApprovedLinks: number;
}

export default function HealthPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState<HealthStats>({
    approvedMappings: 0,
    pendingMappings: 0,
    inactiveMappings: 0,
    unassignedAppointments: 0,
    incompatibleAttempts: null,
    patientsWithoutApprovedLinks: 0,
    donorsWithoutApprovedLinks: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const [linksRes, appointmentsRes, patientsRes, donorsRes] =
          await Promise.all([
            supabase
              .from("patient_donor_links")
              .select("status, patient_id, donor_id"),
            supabase.from("appointments").select("donor_id, status"),
            supabase.from("patients").select("id"),
            supabase.from("donor").select("id"),
          ]);

        const links = linksRes.data || [];
        const appointments = appointmentsRes.data || [];
        const allPatients = patientsRes.data || [];
        const allDonors = donorsRes.data || [];

        const approvedLinks = links.filter(
          (link) => link.status === "approved",
        );
        const approvedMappings = approvedLinks.length;
        const pendingMappings = links.filter(
          (link) => link.status === "pending",
        ).length;
        const inactiveMappings = links.filter(
          (link) => link.status === "inactive",
        ).length;

        const unassignedAppointments = appointments.filter(
          (appt) =>
            !appt.donor_id && !["Completed", "Donated"].includes(appt.status),
        ).length;

        const mappedPatientIds = new Set(
          approvedLinks.map((link) => link.patient_id),
        );
        const mappedDonorIds = new Set(
          approvedLinks.map((link) => link.donor_id),
        );

        const patientsWithoutApprovedLinks = allPatients.filter(
          (patient) => !mappedPatientIds.has(patient.id),
        ).length;

        const donorsWithoutApprovedLinks = allDonors.filter(
          (donor) => !mappedDonorIds.has(donor.id),
        ).length;

        let incompatibleAttempts: number | null = null;
        const { count, error: eventError } = await supabase
          .from("operational_events")
          .select("id", { count: "exact", head: true })
          .eq("event_type", "incompatible_link_attempt");

        if (!eventError) {
          incompatibleAttempts = count || 0;
        }

        setStats({
          approvedMappings,
          pendingMappings,
          inactiveMappings,
          unassignedAppointments,
          incompatibleAttempts,
          patientsWithoutApprovedLinks,
          donorsWithoutApprovedLinks,
        });
      } catch (error) {
        console.error("Error fetching health panel data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  if (loading) {
    return (
      <AdminShell
        active="health"
        title={t("health.title")}
        subtitle={t("health.subtitle")}
      >
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <FaSpinner className="mx-auto animate-spin text-red-500 text-3xl mb-3" />
            <p className="text-slate-500 font-semibold">
              {t("health.loading")}
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      active="health"
      title={t("health.title")}
      subtitle={t("health.subtitle")}
    >
      <div className="max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          <MetricCard
            icon={<FaLink className="text-violet-500" />}
            title={t("health.metric.approvedMappings")}
            value={stats.approvedMappings}
          />
          <MetricCard
            icon={<FaClipboardList className="text-amber-500" />}
            title={t("health.metric.pendingMappings")}
            value={stats.pendingMappings}
          />
          <MetricCard
            icon={<FaExclamationTriangle className="text-red-500" />}
            title={t("health.metric.unassignedAppointments")}
            value={stats.unassignedAppointments}
          />
          <MetricCard
            icon={<FaExclamationTriangle className="text-orange-500" />}
            title={t("health.metric.incompatibleAttempts")}
            value={
              stats.incompatibleAttempts === null
                ? "N/A"
                : stats.incompatibleAttempts
            }
            subtitle={
              stats.incompatibleAttempts === null
                ? t("health.metric.incompatibleAttemptsNA")
                : t("health.metric.incompatibleAttemptsLogged")
            }
          />
        </div>

        <div className="app-card-surface p-6 rounded-3xl">
          <h2 className="text-xl font-black text-slate-900 mb-5">
            {t("health.queue.title")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard
              icon={<FaUsers className="text-blue-500" />}
              title={t("health.queue.patientsNeedPool")}
              count={stats.patientsWithoutApprovedLinks}
              ctaHref="/directory"
              ctaText={t("health.queue.assignMappings")}
            />
            <ActionCard
              icon={<FaHandsHelping className="text-red-500" />}
              title={t("health.queue.donorsNeedPool")}
              count={stats.donorsWithoutApprovedLinks}
              ctaHref="/directory"
              ctaText={t("health.queue.mapDonorPatient")}
            />
            <ActionCard
              icon={<FaClipboardList className="text-amber-500" />}
              title={t("health.queue.appointmentsNeedDonor")}
              count={stats.unassignedAppointments}
              ctaHref="/dashboard"
              ctaText={t("health.queue.openMasterSchedule")}
            />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function MetricCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  subtitle?: string;
}) {
  return (
    <div className="app-card-surface p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <div className="text-2xl">{icon}</div>
      </div>
      <p className="text-3xl font-black text-slate-900">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
    </div>
  );
}

function ActionCard({
  icon,
  title,
  count,
  ctaHref,
  ctaText,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  ctaHref: string;
  ctaText: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-slate-700">{title}</p>
        <div className="text-xl">{icon}</div>
      </div>
      <p className="text-3xl font-black text-slate-900 mb-3">{count}</p>
      <Link
        href={ctaHref}
        className="inline-block text-sm font-bold text-red-600 hover:text-red-700"
      >
        {ctaText} →
      </Link>
    </div>
  );
}
