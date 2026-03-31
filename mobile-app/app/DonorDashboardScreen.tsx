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
  >("upcoming");
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

    setAppointments(appointmentsData || []);

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
          fetch(`${backendUrl}/api/donors/${donorData.id}/profile`),
          fetch(`${backendUrl}/api/dashboard/donor-leaderboard?limit=20`),
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
          <TopControls onLogout={handleLogout} />
          <AlertsPanel
            role="donor"
            recipientId={donorProfile?.id || null}
            isDark={isDark}
          />
          {/* --- Profile Header (Enhanced) --- */}
          <View
            style={[
              styles.profileCard,
              isDark ? styles.profileCardDark : undefined,
            ]}
          >
            <View style={styles.profileCardTop}>
              <View style={styles.welcomeSection}>
                <Text
                  style={[
                    styles.welcomeText,
                    isDark ? styles.welcomeTextDark : undefined,
                  ]}
                >
                  {t("donorHome.welcomeBack")}
                </Text>
                <Text
                  style={[
                    styles.nameText,
                    isDark ? styles.nameTextDark : undefined,
                  ]}
                >
                  {donorName.split(" ")[0]}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.profileDetailsRow,
                isDark ? styles.profileDetailsRowDark : undefined,
              ]}
            >
              <View
                style={[
                  styles.detailBox,
                  isDark ? styles.detailBoxDark : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.detailLabel,
                    isDark ? styles.detailLabelDark : undefined,
                  ]}
                >
                  {t("donorHome.bloodGroup")}
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    isDark ? styles.detailValueDark : undefined,
                  ]}
                >
                  {donorProfile?.blood_group || t("common.na")}
                </Text>
              </View>

              <View
                style={[
                  styles.detailBox,
                  isDark ? styles.detailBoxDark : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.detailLabel,
                    isDark ? styles.detailLabelDark : undefined,
                  ]}
                >
                  {t("donorHome.totalDonations")}
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    isDark ? styles.detailValueDark : undefined,
                  ]}
                >
                  {totalDonations}
                </Text>
              </View>

              <View
                style={[
                  styles.detailBox,
                  isDark ? styles.detailBoxDark : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.detailLabel,
                    isDark ? styles.detailLabelDark : undefined,
                  ]}
                >
                  {t("donorHome.lastDonation")}
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    isDark ? styles.detailValueDark : undefined,
                  ]}
                >
                  {lastDonationDateDisplay}
                </Text>
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
                    {linkedPatients.map((patient) => (
                      <View
                        key={patient.id}
                        style={[
                          styles.linkedPatientItem,
                          isDark ? styles.surfaceCardDark : undefined,
                        ]}
                      >
                        <View style={styles.linkedPatientTopRow}>
                          <Text
                            style={[
                              styles.linkedPatientName,
                              isDark ? styles.textPrimaryDark : undefined,
                            ]}
                          >
                            {patient.name}
                          </Text>
                          <View style={styles.linkedPatientBloodPill}>
                            <Text style={styles.linkedPatientBloodText}>
                              {patient.blood_group}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[
                            styles.linkedPatientPhone,
                            isDark ? styles.textMutedDark : undefined,
                          ]}
                        >
                          {patient.phone}
                        </Text>
                      </View>
                    ))}
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
                                  appointmentId={parseInt(appt.id)}
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
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#FFF5F5",
  },
  fullScreenContainerDark: {
    backgroundColor: "#0b1220",
  },
  container: { flex: 1, padding: 20 },
  scrollContent: {
    paddingBottom: 42,
  },
  summaryStrip: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f1dede",
    paddingVertical: 12,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#D86C6C",
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#8C6F6F",
    textTransform: "uppercase",
  },
  profileCard: {
    backgroundColor: "#FAD4D4",
    padding: 22,
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  profileCardDark: {
    backgroundColor: "#1f2937",
  },
  profileCardTop: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 15,
    color: "#8C6F6F",
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  welcomeTextDark: {
    color: "#fecdd3",
  },
  nameText: {
    fontSize: 36,
    color: "#2f2f2f",
    fontWeight: "800",
    marginTop: 4,
    letterSpacing: -0.5,
  },
  nameTextDark: {
    color: "#fff7ed",
  },
  profileDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#efc6c6",
    gap: 8,
  },
  profileDetailsRowDark: {
    borderTopColor: "rgba(15, 23, 42, 0.5)",
  },
  detailBox: {
    alignItems: "center",
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  detailBoxDark: {
    backgroundColor: "rgba(15, 23, 42, 0.3)",
  },
  detailLabel: {
    fontSize: 11,
    color: "#8C6F6F",
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  detailLabelDark: {
    color: "#fecdd3",
  },
  detailValue: {
    fontSize: 18,
    color: "#2f2f2f",
    fontWeight: "bold",
  },
  detailValueDark: {
    color: "#fff7ed",
  },
  scheduleSection: { padding: 5 },
  linkedSection: { padding: 5, marginBottom: 16 },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 15,
  },
  sectionTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionTab: {
    flex: 1,
    backgroundColor: "#F2E6E6",
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
  },
  sectionTabDark: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectionTabActive: {
    backgroundColor: "#D86C6C",
  },
  sectionTabText: {
    color: "#8C6F6F",
    fontWeight: "700",
    fontSize: 13,
  },
  sectionTabTextDark: {
    color: "#cbd5e1",
  },
  sectionTabTextActive: {
    color: "#FFFFFF",
  },
  sectionAnimated: {
    marginBottom: 4,
  },
  listContainer: { marginTop: 5 },
  appointmentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  arrivalBox: {
    backgroundColor: "#FFF5F5",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCEEEE",
    alignItems: "center",
    marginRight: 15,
    width: 90,
  },
  arrivalLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#D86C6C",
    marginBottom: 2,
  },
  arrivalTime: { fontSize: 22, fontWeight: "900", color: "#333" },
  arrivalDay: { fontSize: 12, color: "#555" },
  statusView: { flex: 1, paddingLeft: 10 },
  statusLabel: { fontSize: 12, color: "#777" },
  patientDateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: "bold", color: "#fff" },
  statusScheduled: { backgroundColor: "#34D399" },
  statusDeclined: { backgroundColor: "#EF4444" },
  statusDefault: { backgroundColor: "#9CA3AF" },
  noAppointments: { padding: 20, backgroundColor: "#FEF3C7", borderRadius: 10 },
  noAppointmentsText: { fontSize: 16, color: "#92400E", textAlign: "center" },
  linkedListContainer: { marginTop: 4 },
  linkedPatientItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F0DFDF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  linkedPatientTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  linkedPatientName: {
    fontSize: 15,
    color: "#333",
    fontWeight: "700",
    flex: 1,
  },
  linkedPatientBloodPill: {
    backgroundColor: "#FFEAEA",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  linkedPatientBloodText: {
    color: "#B42323",
    fontSize: 12,
    fontWeight: "800",
  },
  linkedPatientPhone: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  unlinkedAlertCard: {
    backgroundColor: "#FFF3F3",
    borderColor: "#F5B5B5",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  unlinkedAlertCardDark: {
    backgroundColor: "#2a1215",
    borderColor: "#7f1d1d",
  },
  unlinkedAlertTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#C43C3C",
    marginBottom: 6,
  },
  unlinkedAlertTitleDark: {
    color: "#fca5a5",
  },
  unlinkedAlertText: {
    fontSize: 13,
    color: "#7A3A3A",
    lineHeight: 18,
  },
  unlinkedAlertTextDark: {
    color: "#fecaca",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
  },
  loadingContainerDark: {
    backgroundColor: "#0b1220",
  },
  loadingText: { marginTop: 10, fontSize: 16, color: "#D86C6C" },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  responseButtons: { marginTop: 10 },
  calendarButtonsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  confirmText: { fontSize: 14, color: "#444", marginBottom: 8 },
  buttonRow: { flexDirection: "row" },
  responseBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontWeight: "bold", color: "#fff", fontSize: 14 },
  acceptBtn: { backgroundColor: "#34D399", marginRight: 10 },
  rejectBtn: { backgroundColor: "#EF4444" },
  acceptedLabel: { color: "#34D399", fontWeight: "bold", marginTop: 8 },
  rejectedLabel: { color: "#EF4444", fontWeight: "bold", marginTop: 8 },
  historySection: {
    padding: 0,
    paddingTop: 10,
  },
  historyContainer: {
    marginTop: 5,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: "#34D399",
  },
  historyIndexBox: {
    backgroundColor: "#E8F8F5",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  historyIndex: {
    fontSize: 20,
    fontWeight: "700",
    color: "#34D399",
  },
  historyContent: {
    flex: 1,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  historyDayOfWeek: {
    fontSize: 13,
    color: "#888",
  },
  historyBadge: {
    backgroundColor: "#34D399",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  historyBadgeText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  leaderboardSection: {
    padding: 0,
    paddingTop: 10,
  },
  leaderboardMedalSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f1dede",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  leaderboardMedalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8C6F6F",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  leaderboardMedalValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#D86C6C",
  },
  leaderboardContainer: {
    marginTop: 5,
  },
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  leaderboardItemMedal: {
    backgroundColor: "#FFF9E6",
    borderLeftWidth: 3,
    borderLeftColor: "#FFD700",
  },
  leaderboardRankSection: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    minWidth: 40,
  },
  leaderboardMedal: {
    fontSize: 24,
    fontWeight: "700",
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  leaderboardDonations: {
    fontSize: 12,
    color: "#8C6F6F",
  },
  leaderboardAchievements: {
    justifyContent: "flex-end",
    alignItems: "center",
  },
  leaderboardAchievementBadge: {
    backgroundColor: "#FFE5E5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: "600",
    color: "#D86C6C",
  },
  surfaceCardDark: {
    backgroundColor: "#1f2937",
    borderColor: "#334155",
  },
  textPrimaryDark: {
    color: "#e5e7eb",
  },
  textMutedDark: {
    color: "#94a3b8",
  },
});
