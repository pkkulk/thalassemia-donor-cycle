import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Alert,
  BackHandler,
  RefreshControl,
  Animated,
  Pressable,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useThemeMode } from "@/lib/theme";
import TopControls from "@/components/TopControls";
import { CalendarExportButton } from "@/components/CalendarExportButton";
import AlertsPanel from "@/components/AlertsPanel";

// --- Interface Definitions ---
interface DonationAppointment {
  id: string;
  donor_arrival: string;
  date: string;
  status: string; // 'Scheduled', 'Accepted', 'Declined'
  patient_id?: string;
  patient?: {
    id: string;
    name: string;
    blood_group: string;
  } | null;
}

interface DonorProfile {
  id: string;
  name: string;
  blood_group: string;
  last_donated: string | null;
}

interface DonationHistory {
  id: string;
  date: string;
  patient_id: string;
}

interface LinkedPatient {
  id: string;
  name: string;
  blood_group: string;
  phone: string;
}

interface DonorPatientLinkRaw {
  patient_id: string;
  status?: string | null;
}

interface DonationAppointmentRaw extends Omit<DonationAppointment, "patient"> {
  patient?:
    | {
        id: string;
        name: string;
        blood_group: string;
      }
    | Array<{
        id: string;
        name: string;
        blood_group: string;
      }>
    | null;
}

const DONOR_TABLE_NAME = "donor";

// --- Helper Function ---
const formatDate = (dateString: string | null, includeYear: boolean = true) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: includeYear ? "numeric" : undefined,
    month: "short",
    day: "numeric",
  });
};

export default function DonorDashboardScreen() {
  const { t } = useI18n();
  const { isDark } = useThemeMode();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);
  const [appointments, setAppointments] = useState<DonationAppointment[]>([]);
  const [donationHistory, setDonationHistory] = useState<DonationHistory[]>([]);
  const [linkedPatients, setLinkedPatients] = useState<LinkedPatient[]>([]);
  const [totalDonations, setTotalDonations] = useState(0);
  const [hasLinkedPatients, setHasLinkedPatients] = useState(true);
  const [achievements, setAchievements] = useState<
    Array<{ type: string; unlocked_at: string }>
  >([]);
  const [donorStats, setDonorStats] = useState<{
    consecutive_months: number;
    days_since_donation: number;
  }>({
    consecutive_months: 0,
    days_since_donation: 0,
  });
  const [leaderboard, setLeaderboard] = useState<Array<any>>([]);
  const [donorRank, setDonorRank] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<
    "pool" | "upcoming" | "history" | "leaderboard"
  >("pool");
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sectionAnim = useRef(new Animated.Value(1)).current;

  // --- Handle donor Accept/Decline (Updates Supabase) ---
  const handleDonorResponse = async (
    appointmentId: string,
    newStatus: "Accepted" | "Declined",
  ) => {
    try {
      // Optimistic UI update
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === appointmentId ? { ...appt, status: newStatus } : appt,
        ),
      );

      if (newStatus === "Accepted") {
        // 🔥 ACCEPT: Update appointment status + mark donor unavailable
        const { error: apptError } = await supabase
          .from("appointments")
          .update({ status: newStatus })
          .eq("id", appointmentId);

        if (apptError) throw apptError;

        // Mark donor unavailable for 90 days
        if (donorProfile?.id) {
          const nextAvailable = new Date();
          nextAvailable.setDate(nextAvailable.getDate() + 90);

          const { error: donorError } = await supabase
            .from("donor")
            .update({
              available: false,
              next_available_date: nextAvailable.toISOString(),
            })
            .eq("id", donorProfile.id);

          if (donorError) throw donorError;
        }
      } else {
        // 🔥 DECLINE: Clear appointment assignment + keep donor available
        const { error: apptError } = await supabase
          .from("appointments")
          .update({
            status: newStatus,
            donor_id: null,
            donor_arrival: null,
          })
          .eq("id", appointmentId);

        if (apptError) throw apptError;
      }

      Alert.alert(
        t("donorHome.successTitle"),
        `${t("donorHome.youHave")} ${newStatus.toLowerCase()} ${t("donorHome.thisDonation")}`,
      );

      // Refresh the list
      await fetchDonorData(false);
    } catch (err) {
      console.error("Unexpected error:", err);
      // Revert UI
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === appointmentId ? { ...appt, status: "Scheduled" } : appt,
        ),
      );
      Alert.alert(t("common.error"), t("donorHome.genericError"));
    }
  };

  // --- Fetch donor profile and appointments ---
  const fetchDonorData = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(t("donorHome.authError"));
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
      return;
    }

    // 1️⃣ Fetch Donor Profile
    const { data: donorData, error: donorError } = await supabase
      .from(DONOR_TABLE_NAME)
      .select("id, name, blood_group, last_donated")
      .eq("user_id", user.id)
      .maybeSingle();

    if (donorError) {
      console.error("Error fetching donor profile:", donorError);
      setError(t("donorHome.profileError"));
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
      return;
    }

    if (!donorData) {
      await supabase.auth.signOut();
      Alert.alert(
        "Session expired",
        "Your donor profile no longer exists. Please log in again.",
        [{ text: "OK", onPress: () => router.replace("choose-role") }],
      );
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
      return;
    }

    setDonorProfile(donorData);

    const { data: linkedPatientRows, error: linkedPatientsError } =
      await supabase
        .from("patient_donor_links")
        .select("patient_id, status")
        .eq("donor_id", donorData.id);

    if (linkedPatientsError) {
      console.error(
        "Error fetching linked patient details:",
        linkedPatientsError,
      );
      setHasLinkedPatients(false);
      setLinkedPatients([]);
    } else {
      const rawLinks = (linkedPatientRows || []) as DonorPatientLinkRaw[];

      const isActiveLinkStatus = (status?: string | null) => {
        const normalized = (status || "").toLowerCase().trim();
        return normalized === "approved" || normalized === "active";
      };

      const activeLinks = rawLinks.filter((row) =>
        isActiveLinkStatus(row.status),
      );

      const candidateLinks =
        activeLinks.length > 0
          ? activeLinks
          : rawLinks.filter(
              (row) => (row.status || "").toLowerCase().trim() !== "inactive",
            );

      const patientIds = [
        ...new Set(candidateLinks.map((row) => row.patient_id).filter(Boolean)),
      ];

      setHasLinkedPatients(patientIds.length > 0);

      if (patientIds.length === 0) {
        setLinkedPatients([]);
      } else {
        const { data: linkedPatientsData, error: patientDetailsError } =
          await supabase
            .from("patients")
            .select("id, name, blood_group, phone")
            .in("id", patientIds);

        if (patientDetailsError) {
          console.error(
            "Error fetching linked patient profile details:",
            patientDetailsError,
          );
          setLinkedPatients([]);
        } else {
          setLinkedPatients((linkedPatientsData as LinkedPatient[]) || []);
        }
      }
    }

    // 2️⃣ Fetch Appointments for this donor
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    const { data: appointmentsData, error: apptError } = await supabase
      .from("appointments")
      .select(
        `id, patient_id, date, donor_arrival, status,
         patient:patient_id (id, name, blood_group)`,
      )
      .eq("donor_id", donorData.id)
      .in("status", ["Scheduled", "Accepted", "Declined"]) // Demo mode: allow re-response from declined state
      .is("donor_completed_at", null) // Exclude completed donations
      .order("donor_arrival", { ascending: true });

    if (apptError) {
      console.error("Error fetching appointments:", apptError);
      setError(t("donorHome.fetchAppointmentsError"));
    }

    const normalizedAppointments = (
      (appointmentsData || []) as DonationAppointmentRaw[]
    ).map((appointment) => ({
      ...appointment,
      patient: Array.isArray(appointment.patient)
        ? appointment.patient[0] || null
        : (appointment.patient ?? null),
    }));

    setAppointments(normalizedAppointments);

    // 3️⃣ Fetch Donation History (where donor_completed_at is set)
    const { data: historyData, error: historyError } = await supabase
      .from("appointments")
      .select("id, date, patient_id, donor_completed_at")
      .eq("donor_id", donorData.id)
      .not("donor_completed_at", "is", null)
      .order("donor_completed_at", { ascending: false });

    if (historyError) {
      console.error("❌ Error fetching donation history:", historyError);
    } else {
      console.log(
        "✅ Donation history fetched successfully:",
        historyData?.length || 0,
        "completed appointments",
      );
      if (historyData && historyData.length > 0) {
        console.log("📅 History details:", historyData);
      }
    }

    setDonationHistory(historyData || []);
    setTotalDonations((historyData || []).length);

    // 4️⃣ + 5️⃣ Fetch donor profile/leaderboard (API first, Supabase fallback)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL;

    const loadDonorInsightsFromSupabase = async () => {
      const [{ data: profileRow }, { data: leaderboardRows }] =
        await Promise.all([
          supabase
            .from("vw_donor_profile_summary")
            .select(
              "id, achievements, consecutive_months_donated, days_since_donation",
            )
            .eq("id", donorData.id)
            .maybeSingle(),
          supabase
            .from("vw_top_donors")
            .select("id, name, total_donations, rank, medal")
            .gt("total_donations", 0)
            .order("rank", { ascending: true })
            .limit(20),
        ]);

      const parsedAchievements = Array.isArray(profileRow?.achievements)
        ? profileRow.achievements
        : [];

      setAchievements(
        parsedAchievements as Array<{ type: string; unlocked_at: string }>,
      );
      setDonorStats({
        consecutive_months: Number(profileRow?.consecutive_months_donated || 0),
        days_since_donation: Number(profileRow?.days_since_donation || 0),
      });

      const normalizedLeaderboard = (leaderboardRows || []) as Array<any>;
      setLeaderboard(normalizedLeaderboard);

      const selfRank = normalizedLeaderboard.find(
        (row) => row.id === donorData.id,
      )?.rank;
      setDonorRank(typeof selfRank === "number" ? selfRank : null);
    };

    if (backendUrl) {
      try {
        const [profileResponse, leaderboardResponse] = await Promise.all([
          fetch(`${backendUrl}/api/donors?action=profile&donor_id=${donorData.id}`),
          fetch(`${backendUrl}/api/dashboard?metric=leaderboard&limit=20`),
        ]);

        if (!profileResponse.ok || !leaderboardResponse.ok) {
          await loadDonorInsightsFromSupabase();
        } else {
          const [profileData, leaderboardData] = await Promise.all([
            profileResponse.json(),
            leaderboardResponse.json(),
          ]);

          if (profileData.success && profileData.donor) {
            setAchievements(profileData.donor.achievements || []);
            setDonorStats({
              consecutive_months:
                profileData.donor.stats.consecutive_months_donated,
              days_since_donation: profileData.donor.stats.days_since_donation,
            });
            setDonorRank(profileData.donor.leaderboard.rank);
          }

          if (leaderboardData.success) {
            setLeaderboard(leaderboardData.leaderboard || []);
          }
        }
      } catch {
        await loadDonorInsightsFromSupabase();
      }
    } else {
      await loadDonorInsightsFromSupabase();
    }

    setLoading(false);
    if (isRefreshing) setRefreshing(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  // --- Pull to refresh handler ---
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDonorData(true);
  };

  useEffect(() => {
    fetchDonorData();

    // Set up real-time subscription
    let channel: any = null;

    const setupSubscription = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) return;

        const { data: donorData } = await supabase
          .from(DONOR_TABLE_NAME)
          .select("id")
          .eq("user_id", userData.user.id)
          .single();

        if (!donorData?.id) return;

        const donorId = donorData.id;
        console.log("Setting up subscription for donor:", donorId);

        // Listen to appointment changes
        channel = supabase
          .channel(`appointments-${donorId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "appointments",
            },
            async (payload: any) => {
              // Check if this is this donor's appointment
              if (payload.new?.donor_id === donorId) {
                console.log(
                  "✅ Detected change for this donor. New status:",
                  payload.new.status,
                );
                console.log("📋 Full payload:", payload.new);
                // Refresh data when any of this donor's appointments change
                // Increased delay to ensure DB is fully updated
                setTimeout(() => {
                  console.log(
                    "🔄 Refetching donor data after status change...",
                  );
                  fetchDonorData(false);
                }, 1000); // Increased from 500ms to 1000ms
              }
            },
          )
          .subscribe((status) => {
            console.log("Subscription status:", status);
          });
      } catch (error) {
        console.error("Error setting up subscription:", error);
      }
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        Alert.alert("Exit app", "Do you want to exit the app?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Exit",
            style: "destructive",
            onPress: () => BackHandler.exitApp(),
          },
        ]);
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, []),
  );

  useEffect(() => {
    sectionAnim.setValue(0.85);
    Animated.timing(sectionAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [activeSection, sectionAnim]);

  // --- Loading/Error States ---
  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          isDark ? styles.loadingContainerDark : undefined,
        ]}
      >
        <ActivityIndicator size="large" color="#D86C6C" />
        <Text style={styles.loadingText}>{t("donorHome.loading")}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.loadingContainer,
          isDark ? styles.loadingContainerDark : undefined,
        ]}
      >
        <Text style={styles.errorText}>⚠️ {error}</Text>
      </View>
    );
  }

  const getLocalizedDonorStatus = (status: string) => {
    if (status === "Accepted") return t("donorHome.status.accepted");
    if (status === "Declined") return t("donorHome.status.declined");
    if (status === "Scheduled") return t("donorHome.status.scheduled");
    return status;
  };

  const lastDonationDateDisplay = formatDate(
    donorProfile?.last_donated || null,
  );
  const donorName = donorProfile?.name || t("donorHome.donorFallback");
  const linkedPatientCount = linkedPatients.length;
  const upcomingCount = appointments.length;
  const nextUpcomingDate = appointments
    .map((appointment) => appointment.date)
    .sort((left, right) => left.localeCompare(right))[0];
  const donorFirstName = donorName.split(" ")[0] || donorName;
  const topSubtitle = nextUpcomingDate
    ? `Your next donation in ${Math.max(Math.ceil((new Date(nextUpcomingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)), 0)} days`
    : "No upcoming donations";
  const sectionAnimatedStyle = {
    opacity: sectionAnim,
    transform: [
      {
        translateY: sectionAnim.interpolate({
          inputRange: [0.85, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) {
            Alert.alert("Error", "Could not log out. Please try again.");
            return;
          }
          router.replace("choose-role");
        },
      },
    ]);
  };

  // --- Main UI ---
  return (
    <SafeAreaView
      style={[
        styles.fullScreenContainer,
        isDark ? styles.fullScreenContainerDark : undefined,
      ]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={isDark ? "#0b1220" : "#FFF5F5"}
      />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#D86C6C"
              colors={["#D86C6C"]}
            />
          }
        >
          <TopControls
            onLogout={handleLogout}
            title={`Hi, ${donorFirstName} 👋`}
            subtitle={topSubtitle}
          />
          <AlertsPanel
            role="donor"
            recipientId={donorProfile?.id || null}
            isDark={isDark}
          />
          {/* ─── PROFILE HERO CARD ─── */}
          <View
            style={[
              styles.profileCard,
              isDark ? styles.profileCardDark : undefined,
            ]}
          >
            {/* Decorative circles */}
            <View style={styles.profileDeco1} />
            <View style={styles.profileDeco2} />

            {/* Avatar + name */}
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {donorName.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0,2)}
              </Text>
            </View>
            <Text style={styles.profileName}>{donorName}</Text>
            <Text style={styles.profileSub}>
              {donorProfile?.blood_group || 'N/A'} Donor
              {donorRank ? ` · #${donorRank} on leaderboard` : ''}
            </Text>

            {/* Stats row */}
            <View style={styles.profileStatsRow}>
              <View style={styles.profileStat}>
                <Text style={styles.profileStatNum}>{totalDonations}</Text>
                <Text style={styles.profileStatLbl}>{t('donorHome.totalDonations')}</Text>
              </View>
              <View style={[styles.profileStat, styles.profileStatBorder]}>
                <Text style={styles.profileStatNum}>{linkedPatientCount}</Text>
                <Text style={styles.profileStatLbl}>Patients</Text>
              </View>
              <View style={[styles.profileStat, styles.profileStatBorder]}>
                <Text style={styles.profileStatNum}>
                  {achievements.length > 0 ? '🥇 Gold' : '—'}
                </Text>
                <Text style={styles.profileStatLbl}>Tier</Text>
              </View>
            </View>
          </View>

          <View style={styles.summaryStrip}>
            <View
              style={[
                styles.summaryCard,
                isDark ? styles.surfaceCardDark : undefined,
              ]}
            >
              <Text style={styles.summaryValue}>{linkedPatientCount}</Text>
              <Text style={styles.summaryLabel}>
                {t("donorHome.summary.linkedPatients")}
              </Text>
            </View>
            <View
              style={[
                styles.summaryCard,
                isDark ? styles.surfaceCardDark : undefined,
              ]}
            >
              <Text style={styles.summaryValue}>{upcomingCount}</Text>
              <Text style={styles.summaryLabel}>
                {t("donorHome.summary.upcoming")}
              </Text>
            </View>
            <View
              style={[
                styles.summaryCard,
                isDark ? styles.surfaceCardDark : undefined,
              ]}
            >
              <Text style={styles.summaryValue}>{donorRank || "—"}</Text>
              <Text style={styles.summaryLabel}>Rank</Text>
            </View>
          </View>

          {/* Achievements Section */}
          {achievements && achievements.length > 0 && (
            <View
              style={[
                styles.achievementsCard,
                isDark ? styles.achievementsCardDark : undefined,
              ]}
            >
              <Text
                style={[
                  styles.achievementsTitle,
                  isDark ? styles.achievementsTitleDark : undefined,
                ]}
              >
                🏆 Achievements
              </Text>
              <View style={styles.achievementsBadges}>
                {achievements.map((achievement, idx) => (
                  <View key={idx} style={styles.achievementBadge}>
                    <Text style={styles.badgeEmoji}>
                      {achievement.type === "first_donation"
                        ? "🎖️"
                        : achievement.type === "five_donations"
                          ? "🏆"
                          : achievement.type === "ten_donations"
                            ? "⭐"
                            : achievement.type === "fifty_donations"
                              ? "👑"
                              : achievement.type === "consistency_helper"
                                ? "💪"
                                : "🔥"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!hasLinkedPatients && (
            <View
              style={[
                styles.unlinkedAlertCard,
                isDark ? styles.unlinkedAlertCardDark : undefined,
              ]}
            >
              <Text
                style={[
                  styles.unlinkedAlertTitle,
                  isDark ? styles.unlinkedAlertTitleDark : undefined,
                ]}
              >
                {t("donorHome.unlinkedTitle")}
              </Text>
              <Text
                style={[
                  styles.unlinkedAlertText,
                  isDark ? styles.unlinkedAlertTextDark : undefined,
                ]}
              >
                {t("donorHome.unlinkedDesc")}
              </Text>
            </View>
          )}

          <View style={styles.sectionTabs}>
            <TouchableOpacity
              style={[
                styles.sectionTab,
                isDark ? styles.sectionTabDark : undefined,
                activeSection === "pool" && styles.sectionTabActive,
              ]}
              onPress={() => setActiveSection("pool")}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  isDark ? styles.sectionTabTextDark : undefined,
                  activeSection === "pool" && styles.sectionTabTextActive,
                ]}
              >
                {t("donorHome.tab.pool")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sectionTab,
                isDark ? styles.sectionTabDark : undefined,
                activeSection === "upcoming" && styles.sectionTabActive,
              ]}
              onPress={() => setActiveSection("upcoming")}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  isDark ? styles.sectionTabTextDark : undefined,
                  activeSection === "upcoming" && styles.sectionTabTextActive,
                ]}
              >
                {t("donorHome.tab.upcoming")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sectionTab,
                isDark ? styles.sectionTabDark : undefined,
                activeSection === "history" && styles.sectionTabActive,
              ]}
              onPress={() => setActiveSection("history")}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  isDark ? styles.sectionTabTextDark : undefined,
                  activeSection === "history" && styles.sectionTabTextActive,
                ]}
              >
                {t("donorHome.tab.history")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sectionTab,
                isDark ? styles.sectionTabDark : undefined,
                activeSection === "leaderboard" && styles.sectionTabActive,
              ]}
              onPress={() => setActiveSection("leaderboard")}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  isDark ? styles.sectionTabTextDark : undefined,
                  activeSection === "leaderboard" &&
                    styles.sectionTabTextActive,
                ]}
              >
                {t("donorHome.tab.leaderboard")}
              </Text>
            </TouchableOpacity>
          </View>

          {activeSection === "pool" && (
            <Animated.View
              style={[styles.sectionAnimated, sectionAnimatedStyle]}
            >
              <View style={styles.linkedSection}>
                <Text
                  style={[
                    styles.sectionHeader,
                    isDark ? styles.textPrimaryDark : undefined,
                  ]}
                >
                  {t("donorHome.poolTitle")}
                </Text>

                {linkedPatients.length === 0 ? (
                  <View style={styles.noAppointments}>
                    <Text
                      style={[
                        styles.noAppointmentsText,
                        isDark ? styles.textMutedDark : undefined,
                      ]}
                    >
                      {t("donorHome.noPatientsAssigned")}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.linkedListContainer}>
                    {linkedPatients.map((patient, idx) => {
                      const AVATAR_COLORS = ["#4A8EF0","#7C5CEA","#F03E5E","#22B07A","#F5A623"];
                      const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                      const initials = (patient.name || 'P')
                        .split(' ')
                        .map((w: string) => w[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2);
                      return (
                        <Pressable
                          key={patient.id}
                          style={({ pressed }) => [
                            styles.linkedPatientItem,
                            isDark ? styles.surfaceCardDark : undefined,
                            { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 },
                          ]}
                        >
                          {/* Avatar */}
                          <View style={[styles.patientAvatar, { backgroundColor: avatarBg }]}>
                            <Text style={styles.patientAvatarText}>{initials}</Text>
                          </View>

                          {/* Name + blood + phone */}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={[styles.linkedPatientName, isDark ? styles.textPrimaryDark : undefined]}
                              numberOfLines={1}
                            >
                              {patient.name}
                            </Text>
                            <Text style={[styles.linkedPatientPhone, isDark ? styles.textMutedDark : undefined]}>
                              {patient.blood_group}{patient.phone ? ` · ${patient.phone}` : ''}
                            </Text>
                          </View>

                          {/* Blood group pill */}
                          <View style={styles.linkedPatientBloodPill}>
                            <Text style={styles.linkedPatientBloodText}>{patient.blood_group}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {activeSection === "upcoming" && (
            <Animated.View
              style={[styles.sectionAnimated, sectionAnimatedStyle]}
            >
              <View style={styles.scheduleSection}>
                <Text
                  style={[
                    styles.sectionHeader,
                    isDark ? styles.textPrimaryDark : undefined,
                  ]}
                >
                  {t("donorHome.upcomingTitle")}
                </Text>

                {appointments.length === 0 ? (
                  <View style={styles.noAppointments}>
                    <Text
                      style={[
                        styles.noAppointmentsText,
                        isDark ? styles.textMutedDark : undefined,
                      ]}
                    >
                      {t("donorHome.noUpcomingAppointments")}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.listContainer}>
                    {appointments.map((appt) => (
                      <View
                        key={appt.id}
                        style={[
                          styles.appointmentItem,
                          isDark ? styles.surfaceCardDark : undefined,
                        ]}
                      >
                        <View style={styles.arrivalBox}>
                          <Text style={styles.arrivalLabel}>
                            {t("donorHome.assignedDate")}
                          </Text>
                          <Text style={styles.arrivalTime}>
                            {new Date(appt.donor_arrival).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </Text>
                          <Text style={styles.arrivalDay}>
                            {new Date(appt.donor_arrival).toLocaleDateString(
                              "en-US",
                              { weekday: "long" },
                            )}
                          </Text>
                        </View>

                        <View style={styles.statusView}>
                          <Text style={styles.statusLabel}>
                            {t("donorHome.patientAppointment")}
                          </Text>
                          <Text style={styles.patientDateText}>
                            {formatDate(appt.date)}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              appt.status === "Accepted"
                                ? styles.statusScheduled
                                : appt.status === "Declined"
                                  ? styles.statusDeclined
                                  : styles.statusDefault,
                            ]}
                          >
                            <Text style={styles.statusText}>
                              {getLocalizedDonorStatus(
                                appt.status,
                              ).toUpperCase()}
                            </Text>
                          </View>

                          <View style={styles.responseButtons}>
                            {(appt.status === "Scheduled" ||
                              appt.status === "Declined") && (
                              <>
                                <Text style={styles.confirmText}>
                                  {t("donorHome.confirmDonate")}
                                </Text>
                                <View style={styles.buttonRow}>
                                  <TouchableOpacity
                                    style={[
                                      styles.responseBtn,
                                      styles.acceptBtn,
                                    ]}
                                    onPress={() =>
                                      handleDonorResponse(appt.id, "Accepted")
                                    }
                                  >
                                    <Text style={styles.buttonText}>
                                      {t("donorHome.accept")}
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[
                                      styles.responseBtn,
                                      styles.rejectBtn,
                                    ]}
                                    onPress={() =>
                                      handleDonorResponse(appt.id, "Declined")
                                    }
                                  >
                                    <Text style={styles.buttonText}>
                                      {t("donorHome.cancel")}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </>
                            )}

                            {appt.status === "Accepted" && (
                              <Text style={styles.acceptedLabel}>
                                ✅ {t("donorHome.acceptedLabel")}
                              </Text>
                            )}

                            {appt.status === "Declined" && (
                              <Text style={styles.rejectedLabel}>
                                ❌ {t("donorHome.rejectedLabel")}
                              </Text>
                            )}

                            {/* Calendar Export Buttons - Show when donor accepted */}
                            {appt.status === "Accepted" && appt.patient && (
                              <View style={styles.calendarButtonsContainer}>
                                <CalendarExportButton
                                  appointmentId={appt.id}
                                  patientName={appt.patient.name}
                                  appointmentDate={appt.date}
                                  bloodGroup={appt.patient.blood_group}
                                  backendUrl={
                                    process.env
                                      .NEXT_PUBLIC_BACKEND_API_BASE_URL ||
                                    "http://localhost:3000"
                                  }
                                />
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {activeSection === "history" && (
            <Animated.View
              style={[styles.sectionAnimated, sectionAnimatedStyle]}
            >
              <View style={styles.historySection}>
                <Text
                  style={[
                    styles.sectionHeader,
                    isDark ? styles.textPrimaryDark : undefined,
                  ]}
                >
                  {t("donorHome.historyTitle")}
                </Text>

                {donationHistory.length === 0 ? (
                  <View style={styles.noAppointments}>
                    <Text
                      style={[
                        styles.noAppointmentsText,
                        isDark ? styles.textMutedDark : undefined,
                      ]}
                    >
                      {t("donorHome.noHistory")}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.historyContainer}>
                    {donationHistory.map((donation, index) => (
                      <View
                        key={donation.id}
                        style={[
                          styles.historyItem,
                          isDark ? styles.surfaceCardDark : undefined,
                        ]}
                      >
                        <View style={styles.historyIndexBox}>
                          <Text style={styles.historyIndex}>#{index + 1}</Text>
                        </View>
                        <View style={styles.historyContent}>
                          <Text
                            style={[
                              styles.historyDate,
                              isDark ? styles.textPrimaryDark : undefined,
                            ]}
                          >
                            {new Date(donation.date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </Text>
                          <Text
                            style={[
                              styles.historyDayOfWeek,
                              isDark ? styles.textMutedDark : undefined,
                            ]}
                          >
                            {new Date(donation.date).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "long",
                              },
                            )}
                          </Text>
                        </View>
                        <View style={styles.historyBadge}>
                          <Text style={styles.historyBadgeText}>✓</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {activeSection === "leaderboard" && (
            <Animated.View
              style={[styles.sectionAnimated, sectionAnimatedStyle]}
            >
              <View style={styles.leaderboardSection}>
                <Text
                  style={[
                    styles.sectionHeader,
                    isDark ? styles.textPrimaryDark : undefined,
                  ]}
                >
                  {t("donorHome.leaderboardTitle")}
                </Text>

                <View style={styles.leaderboardMedalSection}>
                  <Text
                    style={[
                      styles.leaderboardMedalLabel,
                      isDark ? styles.textMutedDark : undefined,
                    ]}
                  >
                    {t("donorHome.yourRank")}
                  </Text>
                  <Text style={styles.leaderboardMedalValue}>
                    {donorRank ? `#${donorRank}` : "—"}
                  </Text>
                </View>

                {leaderboard.length === 0 ? (
                  <View style={styles.noAppointments}>
                    <Text
                      style={[
                        styles.noAppointmentsText,
                        isDark ? styles.textMutedDark : undefined,
                      ]}
                    >
                      {t("donorHome.noLeaderboard")}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.leaderboardContainer}>
                    {leaderboard.map((donor, index) => (
                      <View
                        key={donor.id}
                        style={[
                          styles.leaderboardItem,
                          isDark ? styles.surfaceCardDark : undefined,
                          donor.rank <= 3
                            ? styles.leaderboardItemMedal
                            : undefined,
                        ]}
                      >
                        <View style={styles.leaderboardRankSection}>
                          <Text style={styles.leaderboardMedal}>
                            {donor.medal || `#${donor.rank}`}
                          </Text>
                        </View>

                        <View style={styles.leaderboardInfo}>
                          <Text
                            style={[
                              styles.leaderboardName,
                              isDark ? styles.textPrimaryDark : undefined,
                            ]}
                          >
                            {donor.name}
                          </Text>
                          <Text
                            style={[
                              styles.leaderboardDonations,
                              isDark ? styles.textMutedDark : undefined,
                            ]}
                          >
                            {donor.total_donations} {t("donorHome.donations")}
                          </Text>
                        </View>

                        <View style={styles.leaderboardAchievements}>
                          {donor.achievement_count > 0 && (
                            <Text style={styles.leaderboardAchievementBadge}>
                              ✨ {donor.achievement_count}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  /* ── Layout ── */
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#EFEDE8",
  },
  fullScreenContainerDark: {
    backgroundColor: "#0F131A",
  },
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },

  /* ── Profile hero card ── */
  profileCard: {
    marginHorizontal: 0,
    marginBottom: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#C0193A",
    overflow: "hidden",
    position: "relative",
  },
  profileCardDark: {
    backgroundColor: "#8A0E20",
  },
  profileDeco1: {
    position: "absolute",
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  profileDeco2: {
    position: "absolute",
    right: 20,
    bottom: -28,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  profileAvatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  profileSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  profileStatsRow: {
    flexDirection: "row",
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 12,
  },
  profileStat: {
    flex: 1,
    alignItems: "center",
  },
  profileStatBorder: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.2)",
  },
  profileStatNum: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  profileStatLbl: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },

  /* ── Summary strip ── */
  summaryStrip: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(46,45,42,.14)",
    paddingVertical: 12,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#C0193A",
  },
  summaryLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "600",
    color: "#8E8C84",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* ── Achievements ── */
  achievementsCard: {
    marginBottom: 12,
  },
  achievementsCardDark: {},
  achievementsTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8E8C84",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  achievementsTitleDark: {
    color: "#637082",
  },
  achievementsBadges: {
    flexDirection: "row",
    gap: 8,
  },
  achievementBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 0.5,
    borderColor: "rgba(46,45,42,.14)",
    borderRadius: 9999,
  },
  badgeEmoji: {
    fontSize: 14,
  },

  /* ── Tabs ── */
  sectionTabs: {
    flexDirection: "row",
    gap: 0,
    marginBottom: 10,
    paddingHorizontal: 0,
  },
  sectionTab: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 9999,
    marginRight: 4,
    backgroundColor: "transparent",
  },
  sectionTabDark: {
    backgroundColor: "transparent",
  },
  sectionTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#5A5852",
  },
  sectionTabTextDark: {
    color: "#A2ACB8",
  },
  sectionTabTextActive: {
    color: "#C0193A",
    fontWeight: "600",
  },
  sectionAnimated: {
    marginBottom: 4,
  },

  /* ── Appointment cards ── */
  appointmentItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "rgba(46,45,42,.14)",
  },
  arrivalBox: {
    backgroundColor: "#FFF0F3",
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 12,
    minWidth: 50,
  },
  arrivalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#C0193A",
    textTransform: "uppercase",
  },
  arrivalTime: {
    fontSize: 22,
    fontWeight: "700",
    color: "#C0193A",
    lineHeight: 26,
  },
  arrivalDay: {
    fontSize: 10,
    color: "#C0193A",
    opacity: 0.8,
  },
  statusView: { flex: 1 },
  statusLabel: { fontSize: 11, color: "#8E8C84" },
  patientDateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1917",
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 9999,
  },
  statusText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  statusScheduled: { backgroundColor: "#22B07A" },
  statusDeclined: { backgroundColor: "#F03E5E" },
  statusDefault: { backgroundColor: "#8E8C84" },

  /* ── Response buttons ── */
  responseButtons: { marginTop: 10 },
  calendarButtonsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(46,45,42,.10)",
    flexDirection: "row",
    gap: 8,
  },
  confirmText: { fontSize: 13, color: "#5A5852", marginBottom: 6 },
  buttonRow: { flexDirection: "row", gap: 8 },
  responseBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "rgba(46,45,42,.14)",
    backgroundColor: "transparent",
  },
  buttonText: { fontWeight: "600", color: "#fff", fontSize: 13 },
  acceptBtn: { backgroundColor: "#22B07A", borderColor: "#22B07A", marginRight: 0 },
  rejectBtn: { backgroundColor: "transparent", borderColor: "#F03E5E" },
  acceptedLabel: { color: "#22B07A", fontWeight: "700", marginTop: 6, fontSize: 12 },
  rejectedLabel: { color: "#F03E5E", fontWeight: "700", marginTop: 6, fontSize: 12 },

  /* ── Linked patients ── */
  listContainer: { marginTop: 0 },
  linkedSection: { paddingTop: 0 },
  linkedListContainer: { marginTop: 0 },
  linkedPatientItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "rgba(46,45,42,.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  linkedPatientTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  linkedPatientName: {
    fontSize: 13,
    color: "#1A1917",
    fontWeight: "500",
  },
  linkedPatientBloodPill: {
    backgroundColor: "#EEF5FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  linkedPatientBloodText: {
    color: "#1A5CC8",
    fontSize: 11,
    fontWeight: "700",
  },
  linkedPatientPhone: {
    fontSize: 11,
    color: "#8E8C84",
  },

  /* ── Unlinked alert ── */
  unlinkedAlertCard: {
    backgroundColor: "#FFF0F3",
    borderColor: "#FFD6DE",
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  unlinkedAlertCardDark: {
    backgroundColor: "#2A0C12",
    borderColor: "#4A0F1E",
  },
  unlinkedAlertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C0193A",
    marginBottom: 4,
  },
  unlinkedAlertTitleDark: {
    color: "#FF6B87",
  },
  unlinkedAlertText: {
    fontSize: 12,
    color: "#7A0E22",
    lineHeight: 18,
  },
  unlinkedAlertTextDark: {
    color: "#FFB3C2",
  },

  /* ── Loading / Error ── */
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EFEDE8",
  },
  loadingContainerDark: {
    backgroundColor: "#0F131A",
  },
  loadingText: { marginTop: 10, fontSize: 14, color: "#C0193A" },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: "#F03E5E",
    textAlign: "center",
    paddingHorizontal: 20,
  },

  /* ── History ── */
  historySection: { paddingTop: 4 },
  historyContainer: { marginTop: 0 },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "rgba(46,45,42,.14)",
    borderLeftWidth: 3,
    borderLeftColor: "#22B07A",
  },
  historyIndexBox: {
    backgroundColor: "#E6F8F3",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  historyIndex: {
    fontSize: 16,
    fontWeight: "700",
    color: "#22B07A",
  },
  historyContent: { flex: 1 },
  historyDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1917",
    marginBottom: 2,
  },
  historyDayOfWeek: {
    fontSize: 11,
    color: "#8E8C84",
  },
  historyBadge: {
    backgroundColor: "#22B07A",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  historyBadgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  /* ── Leaderboard ── */
  scheduleSection: { paddingTop: 4 },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1917",
    marginBottom: 12,
  },
  leaderboardSection: { paddingTop: 0 },
  leaderboardMedalSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "rgba(46,45,42,.14)",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    alignItems: "center",
  },
  leaderboardMedalLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#8E8C84",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  leaderboardMedalValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#C0193A",
  },
  leaderboardContainer: { marginTop: 0 },
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    marginBottom: 6,
    borderWidth: 0.5,
    borderColor: "rgba(46,45,42,.11)",
  },
  leaderboardItemMedal: {
    backgroundColor: "#FFFBEB",
    borderLeftWidth: 3,
    borderLeftColor: "#FFD700",
  },
  leaderboardRankSection: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    minWidth: 36,
  },
  leaderboardMedal: {
    fontSize: 20,
    fontWeight: "700",
  },
  leaderboardInfo: { flex: 1 },
  leaderboardName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1917",
    marginBottom: 2,
  },
  leaderboardDonations: {
    fontSize: 11,
    color: "#8E8C84",
  },
  leaderboardAchievements: {
    justifyContent: "flex-end",
    alignItems: "center",
  },
  leaderboardAchievementBadge: {
    backgroundColor: "#F3EEFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: "600",
    color: "#4E2EB8",
  },

  /* ── Dark surfaces ── */
  surfaceCardDark: {
    backgroundColor: "#1C2333",
    borderColor: "rgba(148,163,184,.14)",
  },
  textPrimaryDark: {
    color: "#EEF1F4",
  },
  textMutedDark: {
    color: "#A2ACB8",
  },

  /* ── No content ── */
  noAppointments: {
    padding: 20,
    backgroundColor: "#FFF0F3",
    borderRadius: 12,
  },
  noAppointmentsText: {
    fontSize: 13,
    color: "#7A0E22",
    textAlign: "center",
  },
  /* ── Patient avatar (Claude design) ── */
  patientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  patientAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
