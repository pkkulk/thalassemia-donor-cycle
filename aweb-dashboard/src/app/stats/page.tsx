"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import AdminShell from "@/components/AdminShell";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  FaUsers,
  FaHeartbeat,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaTint,
  FaChartLine,
  FaChartBar,
} from "react-icons/fa";
import { MetricTile, SectionShell, StatusChip } from "@/components/ui";

interface KPICard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

interface AnalyticsSummary {
  active_donors: number;
  total_donors: number;
  total_patients: number;
  total_appointments: number;
  completed_appointments: number;
  overall_completion_rate: number;
  declined_appointments: number;
  unassigned_appointments: number;
  active_donor_count: number;
  at_risk_donor_count: number;
  inactive_donor_count: number;
}

interface Trend {
  period: string;
  total: number;
  scheduled: number;
  accepted: number;
  declined: number;
  donated: number;
  completed: number;
  completion_rate: number;
  decline_rate: number;
}

interface Cohort {
  cohort: string;
  count: number;
  percentage: number;
  description: string;
}

export default function StatsPage() {
  const { t } = useI18n();
  const backendApiBaseUrl =
    process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL || "http://localhost:3000";

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [donorCohorts, setDonorCohorts] = useState<Cohort[]>([]);
  const [patientCohorts, setPatientCohorts] = useState<Cohort[]>([]);
  const [bloodGroups, setBloodGroups] = useState<any[]>([]);
  const [bottlenecks, setBottlenecks] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getSupplyStatusLabel = (status: string) => {
    if (status === "Supply shortage") {
      return t("stats.supplyStatus.shortage");
    }
    if (status === "Tight supply") {
      return t("stats.supplyStatus.tight");
    }
    return t("stats.supplyStatus.healthy");
  };

  useEffect(() => {
    const round = (value: number, decimals = 1) => {
      const factor = 10 ** decimals;
      return Math.round(value * factor) / factor;
    };

    const buildCoreTableFallback = async () => {
      const [
        { data: donorsData, error: donorsError },
        { data: patientsData, error: patientsError },
        { data: appointmentsData, error: appointmentsError },
        { data: linksData, error: linksError },
      ] = await Promise.all([
        supabase.from("donor").select("id,blood_group,available"),
        supabase.from("patients").select("id,blood_group"),
        supabase
          .from("appointments")
          .select("id,date,status,donor_id,patient_id"),
        supabase.from("patient_donor_links").select("patient_id,status"),
      ]);

      if (donorsError || patientsError || appointmentsError) {
        console.warn("Core table fallback failed.", {
          donorsError: donorsError?.message,
          patientsError: patientsError?.message,
          appointmentsError: appointmentsError?.message,
          linksError: linksError?.message,
        });
        return;
      }

      const donors = (donorsData || []) as Array<{
        id: string;
        blood_group: string | null;
        available: boolean | null;
      }>;
      const patients = (patientsData || []) as Array<{
        id: string;
        blood_group: string | null;
      }>;
      const appointments = (appointmentsData || []) as Array<{
        id: string;
        date: string;
        status: string | null;
        donor_id: string | null;
        patient_id: string | null;
      }>;
      const links = (linksData || []) as Array<{
        patient_id: string;
        status: string | null;
      }>;

      const normalizedStatus = (status: string | null | undefined) =>
        (status || "").toLowerCase().trim();

      const totalDonors = donors.length;
      const totalPatients = patients.length;
      const totalAppointments = appointments.length;
      const completedAppointments = appointments.filter(
        (a) => normalizedStatus(a.status) === "completed",
      ).length;
      const declinedAppointments = appointments.filter(
        (a) => normalizedStatus(a.status) === "declined",
      ).length;
      const unassignedAppointments = appointments.filter(
        (a) => !a.donor_id,
      ).length;
      const activeAvailable = donors.filter((d) => Boolean(d.available)).length;
      const inactiveDonors = donors.filter((d) => d.available === false).length;
      const completionRate =
        totalAppointments > 0
          ? round((completedAppointments / totalAppointments) * 100)
          : 0;

      setSummary({
        active_donors: activeAvailable,
        total_donors: totalDonors,
        total_patients: totalPatients,
        total_appointments: totalAppointments,
        completed_appointments: completedAppointments,
        overall_completion_rate: completionRate,
        declined_appointments: declinedAppointments,
        unassigned_appointments: unassignedAppointments,
        active_donor_count: activeAvailable,
        at_risk_donor_count: 0,
        inactive_donor_count: inactiveDonors,
      });

      const now = new Date();
      const start30 = new Date(now);
      start30.setDate(now.getDate() - 30);
      const inLast30 = appointments.filter((a) => {
        const d = new Date(a.date);
        return !Number.isNaN(d.getTime()) && d >= start30 && d <= now;
      });

      const scheduled30 = inLast30.filter(
        (a) => normalizedStatus(a.status) === "scheduled",
      ).length;
      const accepted30 = inLast30.filter(
        (a) => normalizedStatus(a.status) === "accepted",
      ).length;
      const donated30 = inLast30.filter(
        (a) => normalizedStatus(a.status) === "donated",
      ).length;
      const completed30 = inLast30.filter(
        (a) => normalizedStatus(a.status) === "completed",
      ).length;
      const declined30 = inLast30.filter(
        (a) => normalizedStatus(a.status) === "declined",
      ).length;

      setTrends([
        {
          period: "last_30_days",
          total: inLast30.length,
          scheduled: scheduled30,
          accepted: accepted30,
          declined: declined30,
          donated: donated30,
          completed: completed30,
          completion_rate:
            inLast30.length > 0
              ? round((completed30 / inLast30.length) * 100)
              : 0,
          decline_rate:
            inLast30.length > 0
              ? round((declined30 / inLast30.length) * 100)
              : 0,
        },
      ]);

      const approvedOrActivePatientIds = new Set(
        links
          .filter((l) => {
            const s = normalizedStatus(l.status);
            return s === "approved" || s === "active";
          })
          .map((l) => l.patient_id),
      );

      const linkedPatientsCount = patients.filter((p) =>
        approvedOrActivePatientIds.has(p.id),
      ).length;
      const unlinkedPatientsCount = Math.max(
        totalPatients - linkedPatientsCount,
        0,
      );

      setPatientCohorts([
        {
          cohort: "Linked to donor pool",
          count: linkedPatientsCount,
          percentage:
            totalPatients > 0
              ? round((linkedPatientsCount / totalPatients) * 100)
              : 0,
          description:
            "Patients with at least one approved or active donor link",
        },
        {
          cohort: "Not linked",
          count: unlinkedPatientsCount,
          percentage:
            totalPatients > 0
              ? round((unlinkedPatientsCount / totalPatients) * 100)
              : 0,
          description: "Patients without an approved or active donor link",
        },
      ]);

      setDonorCohorts([
        {
          cohort: "Available donors",
          count: activeAvailable,
          percentage:
            totalDonors > 0 ? round((activeAvailable / totalDonors) * 100) : 0,
          description: "Donors currently marked available",
        },
        {
          cohort: "Temporarily unavailable",
          count: inactiveDonors,
          percentage:
            totalDonors > 0 ? round((inactiveDonors / totalDonors) * 100) : 0,
          description: "Donors currently marked unavailable",
        },
      ]);

      const bloodGroupOrder = [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
      ];
      const donorCountByGroup = new Map<string, number>();
      const activeByGroup = new Map<string, number>();
      const patientCountByGroup = new Map<string, number>();

      donors.forEach((d) => {
        const group = (d.blood_group || "").toUpperCase().trim();
        if (!group) return;
        donorCountByGroup.set(group, (donorCountByGroup.get(group) || 0) + 1);
        if (d.available) {
          activeByGroup.set(group, (activeByGroup.get(group) || 0) + 1);
        }
      });

      patients.forEach((p) => {
        const group = (p.blood_group || "").toUpperCase().trim();
        if (!group) return;
        patientCountByGroup.set(
          group,
          (patientCountByGroup.get(group) || 0) + 1,
        );
      });

      const supplyDemandRows = bloodGroupOrder.map((group) => {
        const donorCount = donorCountByGroup.get(group) || 0;
        const activeCount = activeByGroup.get(group) || 0;
        const patientDemand = patientCountByGroup.get(group) || 0;
        const ratio =
          patientDemand > 0
            ? round(activeCount / patientDemand, 2)
            : activeCount;

        let supplyStatus = "Healthy supply";
        if (patientDemand > 0 && ratio < 0.5) supplyStatus = "Supply shortage";
        else if (patientDemand > 0 && ratio < 1) supplyStatus = "Tight supply";

        return {
          blood_group: group,
          donor_count: donorCount,
          active_available: activeCount,
          patient_demand: patientDemand,
          supply_to_demand_ratio: ratio,
          supply_status: supplyStatus,
        };
      });

      setBloodGroups(supplyDemandRows);

      const pipelineStages = [
        {
          stage: "Scheduled",
          count: appointments.filter(
            (a) => normalizedStatus(a.status) === "scheduled",
          ).length,
        },
        {
          stage: "Accepted",
          count: appointments.filter(
            (a) => normalizedStatus(a.status) === "accepted",
          ).length,
        },
        {
          stage: "Donated",
          count: appointments.filter(
            (a) => normalizedStatus(a.status) === "donated",
          ).length,
        },
        {
          stage: "Completed",
          count: completedAppointments,
        },
      ].map((stage, index, arr) => {
        if (index === 0) return { ...stage, drop_off_rate: 0 };
        const prev = arr[index - 1].count;
        const dropOff =
          prev > 0 ? round((Math.max(prev - stage.count, 0) / prev) * 100) : 0;
        return { ...stage, drop_off_rate: dropOff };
      });

      setBottlenecks(pipelineStages);

      const derivedInsights: Array<{
        type: string;
        message: string;
        severity: string;
      }> = [];
      const severe = pipelineStages.filter((s) => s.drop_off_rate > 30);
      if (severe.length > 0) {
        derivedInsights.push({
          type: "warning",
          message: `${severe.length} critical bottleneck(s) detected: ${severe.map((s) => s.stage).join(", ")}`,
          severity: "high",
        });
      }
      setInsights(derivedInsights);
    };

    const fetchJsonWithFallback = async (path: string) => {
      const urls = [`${backendApiBaseUrl}${path}`, path];

      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          return response.json();
        } catch {
          // Try next fallback URL.
        }
      }

      return null;
    };

    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [summaryData, supplyData, bottleneckData] = await Promise.all([
          fetchJsonWithFallback("/api/analytics/summary"),
          fetchJsonWithFallback("/api/analytics/supply-demand"),
          fetchJsonWithFallback("/api/analytics/bottlenecks"),
        ]);

        if (summaryData) {
          setSummary(summaryData.summary);
          setTrends(summaryData.trends || []);
          setDonorCohorts(summaryData.donor_cohorts || []);
          setPatientCohorts(summaryData.patient_cohorts || []);
        }

        if (supplyData) {
          setBloodGroups(supplyData.blood_groups || []);
        }

        if (bottleneckData) {
          setBottlenecks(bottleneckData.completion_pipeline || []);
          setInsights(bottleneckData.insights || []);
        }

        if (!summaryData && !supplyData && !bottleneckData) {
          const [
            { data: summaryRow, error: summaryError },
            { data: trendsRows, error: trendsError },
            { data: donorCohortRows, error: donorCohortError },
            { data: patientCohortRows, error: patientCohortError },
            { data: bloodGroupRows, error: bloodGroupError },
            { data: completionRows, error: completionError },
            { data: responseRateRows, error: responseRateError },
          ] = await Promise.all([
            supabase.from("vw_analytics_summary").select("*").single(),
            supabase.from("vw_appointment_trends").select("*"),
            supabase.from("vw_donor_cohorts").select("*"),
            supabase.from("vw_patient_cohorts").select("*"),
            supabase.from("vw_blood_group_distribution").select("*"),
            supabase.from("vw_appointment_completion_metrics").select("*"),
            supabase.from("vw_response_rate_by_period").select("*"),
          ]);

          const hasSupabaseErrors =
            summaryError ||
            trendsError ||
            donorCohortError ||
            patientCohortError ||
            bloodGroupError ||
            completionError ||
            responseRateError;

          if (hasSupabaseErrors) {
            console.warn(
              "Analytics data unavailable from API and Supabase fallback. Showing empty stats.",
              {
                summaryError: summaryError?.message,
                trendsError: trendsError?.message,
                donorCohortError: donorCohortError?.message,
                patientCohortError: patientCohortError?.message,
                bloodGroupError: bloodGroupError?.message,
                completionError: completionError?.message,
                responseRateError: responseRateError?.message,
              },
            );

            await buildCoreTableFallback();
          } else {
            setSummary((summaryRow as AnalyticsSummary) || null);
            setTrends((trendsRows as Trend[]) || []);
            setDonorCohorts((donorCohortRows as Cohort[]) || []);
            setPatientCohorts((patientCohortRows as Cohort[]) || []);
            setBloodGroups((bloodGroupRows as any[]) || []);

            const completionPipeline = (completionRows as any[]) || [];
            const responseRates = (responseRateRows as any[]) || [];
            const criticalBottlenecks = completionPipeline.filter(
              (row) => row.drop_off_rate && row.drop_off_rate > 30,
            );
            const latestRates = responseRates[responseRates.length - 1];
            const derivedInsights: Array<{
              type: string;
              message: string;
              severity: string;
            }> = [];

            if (criticalBottlenecks.length > 0) {
              derivedInsights.push({
                type: "warning",
                message: `${criticalBottlenecks.length} critical bottleneck(s) detected: ${criticalBottlenecks.map((b) => b.stage).join(", ")}`,
                severity: "high",
              });
            }

            if (
              latestRates?.acceptance_rate &&
              latestRates.acceptance_rate < 60
            ) {
              derivedInsights.push({
                type: "alert",
                message: `Low donor acceptance rate (${latestRates.acceptance_rate}%). Consider targeted engagement.`,
                severity: "medium",
              });
            }

            setBottlenecks(completionPipeline);
            setInsights(derivedInsights);
          }
        }
      } catch (error) {
        console.warn("Analytics fetch failed. Showing empty stats.", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [backendApiBaseUrl]);

  const trendChartData = useMemo(
    () =>
      trends.map((trend) => ({
        period: trend.period.replaceAll("_", " "),
        appointments: trend.total,
        completed: trend.completed,
        declined: trend.declined,
        completionRate: trend.completion_rate,
      })),
    [trends],
  );

  const pipelineChartData = useMemo(
    () =>
      bottlenecks.map((stage) => ({
        stage: stage.stage,
        count: stage.count,
        dropOff: stage.drop_off_rate || 0,
      })),
    [bottlenecks],
  );

  const supplyDemandData = useMemo(
    () =>
      bloodGroups.map((group) => ({
        name: group.blood_group,
        supply: group.active_available,
        demand: group.patient_demand,
        ratio: group.supply_to_demand_ratio,
        status: group.supply_status,
      })),
    [bloodGroups],
  );

  const donorCohortChartData = useMemo(
    () =>
      donorCohorts.map((cohort, index) => ({
        name: cohort.cohort,
        value: cohort.count,
        percentage: cohort.percentage,
        color: ["#f03e5e", "#4a8ef0", "#22b07a", "#7c5cea"][index % 4],
      })),
    [donorCohorts],
  );

  const patientCohortChartData = useMemo(
    () =>
      patientCohorts.map((cohort, index) => ({
        name: cohort.cohort,
        value: cohort.count,
        percentage: cohort.percentage,
        color: ["#4a8ef0", "#22b07a", "#f5a623", "#8e8c84"][index % 4],
      })),
    [patientCohorts],
  );

  const kpiCards: KPICard[] = [
    {
      label: t("dashboard.stats.activeDonors"),
      value: summary?.active_donor_count || 0,
      icon: <FaUsers className="text-emerald-500" />,
      color: "bg-emerald-50",
    },
    {
      label: t("stats.kpi.atRiskDonors"),
      value: summary?.at_risk_donor_count || 0,
      icon: <FaExclamationTriangle className="text-amber-500" />,
      color: "bg-amber-50",
    },
    {
      label: t("stats.metric.completionRate"),
      value: `${summary?.overall_completion_rate || 0}%`,
      icon: <FaCheckCircle className="text-blue-500" />,
      color: "bg-blue-50",
    },
    {
      label: t("health.metric.unassignedAppointments"),
      value: summary?.unassigned_appointments || 0,
      icon: <FaTimesCircle className="text-rose-500" />,
      color: "bg-rose-50",
    },
  ];

  if (loading) {
    return (
      <AdminShell
        active="stats"
        title={t("stats.title")}
        subtitle={t("stats.subtitle")}
      >
        <div className="p-6 text-center">
          <p className="text-slate-500">{t("stats.loading")}</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      active="stats"
      title={t("stats.title")}
      subtitle={t("stats.subtitle")}
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="mb-6 flex flex-wrap items-end justify-between gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-subtle)]">
              Analytics overview
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
              {t("stats.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--text-muted)]">
              {t("stats.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusChip tone="rose">Live snapshot</StatusChip>
            <StatusChip tone="blue">
              {summary?.overall_completion_rate || 0}% completion
            </StatusChip>
            <StatusChip tone="emerald">
              {summary?.active_donor_count || 0} active donors
            </StatusChip>
          </div>
        </motion.div>

        {/* Insights Alert */}
        {insights.length > 0 && (
          <div className="mb-6 space-y-3">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`rounded-[1.25rem] border px-4 py-4 shadow-sm ${
                  insight.severity === "high"
                    ? "border-[#ffd3de] bg-[#fff0f3] text-[#9e1136]"
                    : "border-[#ffe1b6] bg-[#fff7eb] text-[#9a6208]"
                }`}
              >
                <p className="text-sm font-semibold">{insight.message}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((kpi) => (
            <MetricTile
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              tone="slate"
            />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-3 mb-6">
          <SectionShell
            title={t("stats.section.thirtyDayTrend")}
            subtitle={t("stats.trend.totalAppointments")}
            className="xl:col-span-2"
          >
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendChartData}
                  margin={{ left: 8, right: 8, top: 10 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#e7e2dc" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="appointments"
                    stroke="#4a8ef0"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#22b07a"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="declined"
                    stroke="#f03e5e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionShell>

          <SectionShell
            title={t("stats.section.completionPipeline")}
            subtitle={t("stats.pipeline.dropOff")}
          >
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pipelineChartData}
                  margin={{ left: 8, right: 8, top: 10 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#e7e2dc" />
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c5cea" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-3">
              {pipelineChartData.map((stage) => (
                <div
                  key={stage.stage}
                  className="rounded-[1rem] border border-[color:var(--border-1)] bg-[color:var(--surface-2)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[color:var(--foreground)]">
                      {stage.stage}
                    </span>
                    <span className="font-semibold text-[color:var(--foreground)]">
                      {stage.count}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {t("stats.pipeline.dropOff")}: {stage.dropOff}%
                  </p>
                </div>
              ))}
            </div>
          </SectionShell>
        </div>

        <div className="grid gap-6 xl:grid-cols-2 mb-6">
          <SectionShell
            title={t("stats.section.bloodGroupSupplyDemand")}
            subtitle={t("stats.table.ratio")}
          >
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={supplyDemandData}
                  margin={{ left: 8, right: 8, top: 10 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="#e7e2dc" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="supply"
                    fill="#22b07a"
                    radius={[10, 10, 0, 0]}
                  />
                  <Bar
                    dataKey="demand"
                    fill="#4a8ef0"
                    radius={[10, 10, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionShell>

          <SectionShell
            title={t("stats.section.donorCohorts")}
            subtitle={t("stats.section.patientCohorts")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-[color:var(--border-1)] bg-[color:var(--surface-2)] p-4">
                <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                  Donor cohorts
                </h4>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donorCohortChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={54}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {donorCohortChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-[color:var(--border-1)] bg-[color:var(--surface-2)] p-4">
                <h4 className="mb-3 text-sm font-semibold text-[color:var(--foreground)]">
                  Patient cohorts
                </h4>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={patientCohortChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={54}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {patientCohortChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {donorCohorts.map((cohort) => (
                <div
                  key={cohort.cohort}
                  className="rounded-[1rem] border border-[color:var(--border-1)] bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-[color:var(--foreground)]">
                      {cohort.cohort}
                    </span>
                    <span className="font-semibold text-[color:var(--foreground)]">
                      {cohort.count}{" "}
                      <span className="text-xs text-[color:var(--text-muted)]">
                        ({cohort.percentage}%)
                      </span>
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {cohort.description}
                  </p>
                </div>
              ))}
            </div>
          </SectionShell>
        </div>

        <SectionShell
          title={t("stats.section.bloodGroupSupplyDemand")}
          subtitle={t("stats.table.bloodGroup")}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border-1)]">
                  <th className="p-3 text-left font-semibold text-[color:var(--text-muted)]">
                    {t("stats.table.bloodGroup")}
                  </th>
                  <th className="p-3 text-center font-semibold text-[color:var(--text-muted)]">
                    {t("stats.table.availableDonors")}
                  </th>
                  <th className="p-3 text-center font-semibold text-[color:var(--text-muted)]">
                    {t("stats.table.active")}
                  </th>
                  <th className="p-3 text-center font-semibold text-[color:var(--text-muted)]">
                    {t("stats.table.registeredPatients")}
                  </th>
                  <th className="p-3 text-center font-semibold text-[color:var(--text-muted)]">
                    {t("stats.table.ratio")}
                  </th>
                  <th className="p-3 text-center font-semibold text-[color:var(--text-muted)]">
                    {t("directory.modal.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {bloodGroups.map((bg, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-[color:var(--border-1)] hover:bg-[color:var(--surface-2)]"
                  >
                    <td className="p-3 font-semibold text-[color:var(--foreground)]">
                      {bg.blood_group}
                    </td>
                    <td className="p-3 text-center text-[color:var(--text-muted)]">
                      {bg.donor_count}
                    </td>
                    <td className="p-3 text-center font-semibold text-[#0d6b43]">
                      {bg.active_available}
                    </td>
                    <td className="p-3 text-center text-[color:var(--text-muted)]">
                      {bg.patient_demand}
                    </td>
                    <td className="p-3 text-center font-semibold text-[color:var(--foreground)]">
                      {bg.supply_to_demand_ratio}x
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                          bg.supply_status === "Supply shortage"
                            ? "bg-[#fff0f3] text-[#a31237]"
                            : bg.supply_status === "Tight supply"
                              ? "bg-[#fff7eb] text-[#9a6208]"
                              : "bg-[#e7f8ef] text-[#0d6b43]"
                        }`}
                      >
                        {getSupplyStatusLabel(bg.supply_status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionShell>
      </div>
    </AdminShell>
  );
}
