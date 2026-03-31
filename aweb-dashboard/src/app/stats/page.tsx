"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import AppTopNav from "@/components/AppTopNav";
import { supabase } from "@/lib/supabase";
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
        supabase.from("appointments").select("id,date,status,donor_id,patient_id"),
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
      const unassignedAppointments = appointments.filter((a) => !a.donor_id)
        .length;
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
            inLast30.length > 0 ? round((completed30 / inLast30.length) * 100) : 0,
          decline_rate:
            inLast30.length > 0 ? round((declined30 / inLast30.length) * 100) : 0,
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
      const unlinkedPatientsCount = Math.max(totalPatients - linkedPatientsCount, 0);

      setPatientCohorts([
        {
          cohort: "Linked to donor pool",
          count: linkedPatientsCount,
          percentage:
            totalPatients > 0 ? round((linkedPatientsCount / totalPatients) * 100) : 0,
          description: "Patients with at least one approved or active donor link",
        },
        {
          cohort: "Not linked",
          count: unlinkedPatientsCount,
          percentage:
            totalPatients > 0 ? round((unlinkedPatientsCount / totalPatients) * 100) : 0,
          description: "Patients without an approved or active donor link",
        },
      ]);

      setDonorCohorts([
        {
          cohort: "Available donors",
          count: activeAvailable,
          percentage: totalDonors > 0 ? round((activeAvailable / totalDonors) * 100) : 0,
          description: "Donors currently marked available",
        },
        {
          cohort: "Temporarily unavailable",
          count: inactiveDonors,
          percentage: totalDonors > 0 ? round((inactiveDonors / totalDonors) * 100) : 0,
          description: "Donors currently marked unavailable",
        },
      ]);

      const bloodGroupOrder = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
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
        patientCountByGroup.set(group, (patientCountByGroup.get(group) || 0) + 1);
      });

      const supplyDemandRows = bloodGroupOrder.map((group) => {
        const donorCount = donorCountByGroup.get(group) || 0;
        const activeCount = activeByGroup.get(group) || 0;
        const patientDemand = patientCountByGroup.get(group) || 0;
        const ratio = patientDemand > 0 ? round(activeCount / patientDemand, 2) : activeCount;

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
          count: appointments.filter((a) => normalizedStatus(a.status) === "scheduled").length,
        },
        {
          stage: "Accepted",
          count: appointments.filter((a) => normalizedStatus(a.status) === "accepted").length,
        },
        {
          stage: "Donated",
          count: appointments.filter((a) => normalizedStatus(a.status) === "donated").length,
        },
        {
          stage: "Completed",
          count: completedAppointments,
        },
      ].map((stage, index, arr) => {
        if (index === 0) return { ...stage, drop_off_rate: 0 };
        const prev = arr[index - 1].count;
        const dropOff = prev > 0 ? round((Math.max(prev - stage.count, 0) / prev) * 100) : 0;
        return { ...stage, drop_off_rate: dropOff };
      });

      setBottlenecks(pipelineStages);

      const derivedInsights: Array<{ type: string; message: string; severity: string }> = [];
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <AppTopNav active="stats" />
        <div className="p-6 text-center">
          <p className="text-slate-500">{t("stats.loading")}</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <AppTopNav active="stats" />

      <div className="max-w-7xl mx-auto p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            📊 {t("stats.title")}
          </h1>
          <p className="text-sm text-slate-600">{t("stats.subtitle")}</p>
        </div>

        {/* Insights Alert */}
        {insights.length > 0 && (
          <div className="mb-6 space-y-3">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.severity === "high"
                    ? "border-rose-500 bg-rose-50 text-rose-800"
                    : "border-amber-500 bg-amber-50 text-amber-800"
                }`}
              >
                <p className="font-bold text-sm">{insight.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((kpi, idx) => (
            <div
              key={idx}
              className={`${kpi.color} p-6 rounded-2xl border border-slate-200 shadow-sm`}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  {kpi.label}
                </h4>
                <div className="text-2xl">{kpi.icon}</div>
              </div>
              <p className="text-3xl font-black text-slate-900">{kpi.value}</p>
              {kpi.trend && (
                <p className="text-xs text-slate-600 mt-1">{kpi.trend}</p>
              )}
            </div>
          ))}
        </div>

        {/* Trends Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 30-Day Trend */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FaChartLine className="text-blue-500" />
              <h3 className="text-lg font-black text-slate-900">
                {t("stats.section.thirtyDayTrend")}
              </h3>
            </div>
            {trends.find((t) => t.period === "last_30_days") && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">
                    {t("stats.trend.totalAppointments")}
                  </span>
                  <span className="font-bold text-slate-900">
                    {trends.find((t) => t.period === "last_30_days")?.total ||
                      0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">
                    {t("stats.section.completed")}
                  </span>
                  <span className="text-emerald-600 font-bold">
                    {trends.find((t) => t.period === "last_30_days")
                      ?.completed || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">
                    {t("directory.appt.status.declined")}
                  </span>
                  <span className="text-rose-600 font-bold">
                    {trends.find((t) => t.period === "last_30_days")
                      ?.declined || 0}
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-slate-700">
                      {t("stats.metric.completionRate")}
                    </span>
                    <span className="text-lg font-black text-blue-600">
                      {trends.find((t) => t.period === "last_30_days")
                        ?.completion_rate || 0}
                      %
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Completion Pipeline */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FaChartBar className="text-slate-600" />
              <h3 className="text-lg font-black text-slate-900">
                {t("stats.section.completionPipeline")}
              </h3>
            </div>
            <div className="space-y-2">
              {bottlenecks.map((stage, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-bold text-slate-700">
                      {stage.stage}
                    </span>
                    <span className="text-xs font-black text-slate-900">
                      {stage.count}
                    </span>
                  </div>
                  {stage.drop_off_rate && (
                    <div className="bg-slate-200 rounded h-1.5">
                      <div
                        className={`h-1.5 rounded ${
                          stage.drop_off_rate > 30
                            ? "bg-rose-500"
                            : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(stage.drop_off_rate, 100)}%`,
                        }}
                      />
                    </div>
                  )}
                  {stage.drop_off_rate && (
                    <p className="text-xs text-slate-600 mt-1">
                      {t("stats.pipeline.dropOff")}: {stage.drop_off_rate}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cohorts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Donor Cohorts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-4">
              {t("stats.section.donorCohorts")}
            </h3>
            <div className="space-y-3">
              {donorCohorts.map((cohort, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-slate-900 text-sm">
                      {cohort.cohort}
                    </span>
                    <span className="font-black text-slate-900">
                      {cohort.count}
                      <span className="text-xs text-slate-600 ml-1">
                        ({cohort.percentage}%)
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{cohort.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Patient Cohorts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 mb-4">
              {t("stats.section.patientCohorts")}
            </h3>
            <div className="space-y-3">
              {patientCohorts.map((cohort, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="font-bold text-slate-900 text-sm">
                      {cohort.cohort}
                    </span>
                    <span className="font-black text-slate-900">
                      {cohort.count}
                      <span className="text-xs text-slate-600 ml-1">
                        ({cohort.percentage}%)
                      </span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{cohort.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Blood Group Supply/Demand */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FaTint className="text-red-500" />
            <h3 className="text-lg font-black text-slate-900">
              {t("stats.section.bloodGroupSupplyDemand")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 font-black text-slate-700">
                    {t("stats.table.bloodGroup")}
                  </th>
                  <th className="text-center p-3 font-black text-slate-700">
                    {t("stats.table.availableDonors")}
                  </th>
                  <th className="text-center p-3 font-black text-slate-700">
                    {t("stats.table.active")}
                  </th>
                  <th className="text-center p-3 font-black text-slate-700">
                    {t("stats.table.registeredPatients")}
                  </th>
                  <th className="text-center p-3 font-black text-slate-700">
                    {t("stats.table.ratio")}
                  </th>
                  <th className="text-center p-3 font-black text-slate-700">
                    {t("directory.modal.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {bloodGroups.map((bg, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="p-3 font-bold text-slate-900">
                      {bg.blood_group}
                    </td>
                    <td className="text-center p-3 text-slate-600">
                      {bg.donor_count}
                    </td>
                    <td className="text-center p-3 text-emerald-600 font-bold">
                      {bg.active_available}
                    </td>
                    <td className="text-center p-3 text-slate-600">
                      {bg.patient_demand}
                    </td>
                    <td className="text-center p-3 font-bold text-slate-900">
                      {bg.supply_to_demand_ratio}x
                    </td>
                    <td className="text-center p-3">
                      <span
                        className={`text-xs font-black rounded-full px-2 py-1 ${
                          bg.supply_status === "Supply shortage"
                            ? "bg-rose-100 text-rose-700"
                            : bg.supply_status === "Tight supply"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
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
        </div>
      </div>
    </div>
  );
}
