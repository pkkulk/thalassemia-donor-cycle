import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
  SafeAreaView,
  RefreshControl,
  Animated,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useThemeMode } from "@/lib/theme";
import TopControls from "@/components/TopControls";
import { CalendarExportButton } from "@/components/CalendarExportButton";
import AlertsPanel from "@/components/AlertsPanel";

interface PatientProfile {
  id: string;
  name: string;
  user_id: string;
}

interface DonorInfo {
  id: string;
  name: string;
  phone: string;
  blood_group: string;
}

interface Appointment {
  id: string;
  date: string;
  status: string;
  donor_id: string | null;
  donor_arrival: string | null;
  donor?: DonorInfo | DonorInfo[] | null;
}

interface PatientDonorLinkRaw {
  id: string;
  donor?: DonorInfo | DonorInfo[] | null;
}

export default function PatientHomeScreen() {
  const { t } = useI18n();
  const { isDark } = useThemeMode();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<
    Appointment[]
  >([]);
  const [appointmentHistory, setAppointmentHistory] = useState<Appointment[]>(
    [],
  );
  const [linkedDonors, setLinkedDonors] = useState<DonorInfo[]>([]);
  const [hasLinkedDonors, setHasLinkedDonors] = useState(true);
  const [activeSection, setActiveSection] = useState<
    "pool" | "upcoming" | "history"
  >("pool");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sectionAnim = useRef(new Animated.Value(1)).current;

  const fetchPatientData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) {
        setLoading(false);
        return;
      }

      // Fetch patient profile
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id, name, user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (patientError) throw patientError;
      if (!patientData) {
        await supabase.auth.signOut();
        Alert.alert(
          "Session expired",
          "Your patient profile no longer exists. Please log in again.",
          [{ text: "OK", onPress: () => router.replace("choose-role") }],
        );
        setLoading(false);
        return;
      }

      setPatient(patientData);

      // Check if patient has any approved donor links
      const { count: linkedCount, error: linkError } = await supabase
        .from("patient_donor_links")
        .select("id", { count: "exact", head: true })
        .eq("patient_id", patientData.id)
        .eq("status", "approved");

      if (linkError) {
        console.error("Error fetching patient-donor links:", linkError);
      } else {
        setHasLinkedDonors((linkedCount || 0) > 0);
      }

      const { data: linkedDonorRows, error: linkedDonorError } = await supabase
        .from("patient_donor_links")
        .select(
          `
          id,
          donor:donor_id (
            id,
            name,
            phone,
            blood_group
          )
        `,
        )
        .eq("patient_id", patientData.id)
        .eq("status", "approved");

      if (linkedDonorError) {
        console.error("Error fetching linked donor details:", linkedDonorError);
      } else {
        const normalizedDonors = (
          (linkedDonorRows || []) as PatientDonorLinkRaw[]
        )
          .map((row) => (Array.isArray(row.donor) ? row.donor[0] : row.donor))
          .filter((donor): donor is DonorInfo => Boolean(donor));

        setLinkedDonors(normalizedDonors);
      }

      // Fetch all appointments with donor info
      const { data: appointments, error: apptError } = await supabase
        .from("appointments")
        .select(
          `
          id,
          date,
          status,
          donor_id,
          donor_arrival,
          donor:donor_id (
            id,
            name,
            phone,
            blood_group
          )
        `,
        )
        .eq("patient_id", patientData.id)
        .order("date", { ascending: false });

      if (apptError) throw apptError;

      // Split into upcoming and history
      const upcoming =
        appointments?.filter(
          (appt) => appt.status === "Scheduled" || appt.status === "Accepted",
        ) || [];

      const history =
        appointments?.filter(
          (appt) => appt.status === "Completed" || appt.status === "Declined",
        ) || [];

      setUpcomingAppointments(upcoming);
      setAppointmentHistory(history);
    } catch (error) {
      console.error("Error fetching patient data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }
  };

  useEffect(() => {
    fetchPatientData();

    // Set up real-time subscription for appointment updates
    const channel = supabase
      .channel("patient-appointments-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload) => {
          console.log("Appointment change detected:", payload);
          fetchPatientData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchPatientData();
  };

  useEffect(() => {
    sectionAnim.setValue(0.85);
    Animated.timing(sectionAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [activeSection, sectionAnim]);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      Scheduled: {
        label: t("patientHome.status.waitingDonor"),
        color: "#FFA726",
      },
      Accepted: {
        label: t("patientHome.status.donorAccepted"),
        color: "#66BB6A",
      },
      Declined: {
        label: t("patientHome.status.donorDeclined"),
        color: "#EF5350",
      },
      Completed: { label: t("patientHome.status.completed"), color: "#42A5F5" },
    };

    const config = statusConfig[status] || { label: status, color: "#999" };
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
        <Text style={styles.statusText}>{config.label}</Text>
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDonorInfo = (appt: Appointment): DonorInfo | null => {
    if (!appt.donor) return null;
    return Array.isArray(appt.donor) ? appt.donor[0] : appt.donor;
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

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          isDark ? styles.containerDark : undefined,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#D86C6C" />
      </View>
    );
  }

  const nextPatientAppointmentDate = upcomingAppointments
    .map((appointment) => appointment.date)
    .sort((left, right) => left.localeCompare(right))[0];
  const patientFirstName =
    patient?.name?.split(" ")[0] || t("patientHome.userFallback");
  const patientTopSubtitle = nextPatientAppointmentDate
    ? `Your donation is on ${new Date(
        nextPatientAppointmentDate,
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`
    : "No upcoming donations";

  return (
    <SafeAreaView
      style={[
        styles.safeContainer,
        isDark ? styles.safeContainerDark : undefined,
      ]}
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: 4 }]}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <TopControls
            onLogout={handleLogout}
            title={`Hi, ${patientFirstName} 🌸`}
            subtitle={patientTopSubtitle}
          />
          <AlertsPanel
            role="patient"
            recipientId={patient?.id || null}
            isDark={isDark}
          />

          {/* ─── PATIENT HERO CARD ─── */}
          <View
            style={[
              styles.welcomeCard,
              isDark ? styles.welcomeCardDark : undefined,
            ]}
          >
            {/* Decorative circles */}
            <View style={styles.heroDeco1} />
            <View style={styles.heroDeco2} />

            {/* Avatar + name */}
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>
                {(patient?.name || 'P').split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0,2)}
              </Text>
            </View>
            <Text style={styles.heroName}>
              {t('patientHome.hello')}, {patient?.name || t('patientHome.userFallback')}!
            </Text>
            <Text style={styles.heroDate}>
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>

            {/* Stats row */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatNum}>{linkedDonors.length}</Text>
                <Text style={styles.heroStatLbl}>{t('patientHome.tab.pool')}</Text>
              </View>
              <View style={[styles.heroStat, styles.heroStatBorder]}>
                <Text style={styles.heroStatNum}>{upcomingAppointments.length}</Text>
                <Text style={styles.heroStatLbl}>{t('patientHome.tab.upcoming')}</Text>
              </View>
              <View style={[styles.heroStat, styles.heroStatBorder]}>
                <Text style={styles.heroStatNum}>{appointmentHistory.length}</Text>
                <Text style={styles.heroStatLbl}>{t('patientHome.tab.history')}</Text>
              </View>
            </View>
          </View>

          {!hasLinkedDonors && (
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
                {t("patientHome.unlinkedTitle")}
              </Text>
              <Text
                style={[
                  styles.unlinkedAlertText,
                  isDark ? styles.unlinkedAlertTextDark : undefined,
                ]}
              >
                {t("patientHome.unlinkedDesc")}
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
                {t("patientHome.tab.pool")}
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
                {t("patientHome.tab.upcoming")}
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
                {t("patientHome.tab.history")}
              </Text>
            </TouchableOpacity>
          </View>

          {activeSection === "pool" && (
            <Animated.View
              style={[
                styles.sectionAnimated,
                {
                  opacity: sectionAnim,
                  transform: [
                    {
                      translateY: sectionAnim.interpolate({
                        inputRange: [0.85, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.sectionTitle}>
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={isDark ? "#e5e7eb" : "#333"}
                />{" "}
                {t("patientHome.poolTitle")}
              </Text>

              {linkedDonors.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="person-remove-outline"
                    size={44}
                    color="#ccc"
                  />
                  <Text style={styles.emptyText}>
                    {t("patientHome.noDonors")}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {t("patientHome.noDonorsHint")}
                  </Text>
                </View>
              ) : (
                <View style={styles.cardList}>
                  {linkedDonors.map((donor, idx) => {
                    // Assign deterministic avatar colors matching design spec
                    const AVATAR_COLORS = [
                      "#F03E5E", // red
                      "#7C5CEA", // purple
                      "#4A8EF0", // blue
                      "#22B07A", // green
                      "#F5A623", // amber
                    ];
                    const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                    const initials = (donor.name || 'D')
                      .split(' ')
                      .map((w: string) => w[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    const donationCount = (donor as any).total_donations ?? '';
                    const statusLabel = (donor as any).status_label ?? 'Active';
                    const isActive = statusLabel.toLowerCase() === 'active';

                    return (
                      <Pressable
                        key={donor.id}
                        style={({ pressed }) => [
                          styles.linkedPoolCard,
                          isDark ? styles.surfaceCardDark : undefined,
                          { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 },
                        ]}
                      >
                        {/* Avatar */}
                        <View style={[styles.donorAvatar, { backgroundColor: avatarBg }]}>
                          <Text style={styles.donorAvatarText}>{initials}</Text>
                        </View>

                        {/* Name + meta */}
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={[styles.linkedPoolName, isDark ? styles.textPrimaryDark : undefined]}
                            numberOfLines={1}
                          >
                            {donor.name}
                          </Text>
                          <Text style={[styles.donorMetaText, isDark ? styles.textMutedDark : undefined]}>
                            {donor.blood_group}{donationCount ? ` · ${donationCount} donations` : ''}
                          </Text>
                        </View>

                        {/* Status pill */}
                        <View style={[
                          styles.statusPill,
                          isActive ? styles.statusPillActive : styles.statusPillIdle,
                        ]}>
                          {isActive && (
                            <View style={styles.statusDot} />
                          )}
                          <Text style={[
                            styles.statusPillText,
                            isActive ? styles.statusPillTextActive : styles.statusPillTextIdle,
                          ]}>
                            {statusLabel}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          )}

          {activeSection === "upcoming" && (
            <Animated.View
              style={[
                styles.sectionAnimated,
                {
                  opacity: sectionAnim,
                  transform: [
                    {
                      translateY: sectionAnim.interpolate({
                        inputRange: [0.85, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.sectionTitle}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={isDark ? "#e5e7eb" : "#333"}
                />{" "}
                {t("patientHome.upcomingTitle")}
              </Text>

              {upcomingAppointments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {t("patientHome.noUpcoming")}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {t("patientHome.noUpcomingHint")}
                  </Text>
                </View>
              ) : (
                <View style={styles.cardList}>
                  {upcomingAppointments.map((appt) => {
                    const donor = getDonorInfo(appt);
                    return (
                      <View
                        key={appt.id}
                        style={[
                          styles.appointmentCard,
                          isDark ? styles.surfaceCardDark : undefined,
                        ]}
                      >
                        <View style={styles.appointmentHeader}>
                          <Text
                            style={[
                              styles.appointmentDate,
                              isDark ? styles.textPrimaryDark : undefined,
                            ]}
                          >
                            {formatDate(appt.date)}
                          </Text>
                          {getStatusBadge(appt.status)}
                        </View>

                        {donor ? (
                          <View
                            style={[
                              styles.donorInfo,
                              isDark ? styles.donorInfoDark : undefined,
                            ]}
                          >
                            <View style={styles.donorHeader}>
                              <Ionicons
                                name="person-circle"
                                size={24}
                                color="#D86C6C"
                              />
                              <Text
                                style={[
                                  styles.donorLabel,
                                  isDark ? styles.textMutedDark : undefined,
                                ]}
                              >
                                {t("patientHome.assignedDonor")}
                              </Text>
                            </View>
                            <Text style={styles.donorName}>{donor.name}</Text>
                            <View style={styles.donorDetails}>
                              <View style={styles.donorDetailItem}>
                                <Ionicons name="water" size={16} color="#666" />
                                <Text
                                  style={[
                                    styles.donorDetailText,
                                    isDark ? styles.textMutedDark : undefined,
                                  ]}
                                >
                                  {donor.blood_group}
                                </Text>
                              </View>
                              <View style={styles.donorDetailItem}>
                                <Ionicons name="call" size={16} color="#666" />
                                <Text
                                  style={[
                                    styles.donorDetailText,
                                    isDark ? styles.textMutedDark : undefined,
                                  ]}
                                >
                                  {donor.phone}
                                </Text>
                              </View>
                            </View>
                            {appt.donor_arrival && (
                              <View
                                style={[
                                  styles.arrivalInfo,
                                  isDark ? styles.arrivalInfoDark : undefined,
                                ]}
                              >
                                <Ionicons
                                  name="time-outline"
                                  size={16}
                                  color="#555"
                                />
                                <Text
                                  style={[
                                    styles.arrivalText,
                                    isDark ? styles.textPrimaryDark : undefined,
                                  ]}
                                >
                                  {t("patientHome.scheduled")}{" "}
                                  {new Date(appt.donor_arrival).toLocaleString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    },
                                  )}
                                </Text>
                              </View>
                            )}

                            {/* Calendar Export Buttons - Show when donor is assigned */}
                            <View style={styles.calendarButtonsContainer}>
                              <CalendarExportButton
                                appointmentId={appt.id}
                                patientName={patient?.name || "Patient"}
                                appointmentDate={appt.date}
                                bloodGroup={donor.blood_group}
                                backendUrl={
                                  process.env
                                    .NEXT_PUBLIC_BACKEND_API_BASE_URL ||
                                  "http://localhost:3000"
                                }
                              />
                            </View>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.noDonorInfo,
                              isDark ? styles.noDonorInfoDark : undefined,
                            ]}
                          >
                            <Ionicons
                              name="hourglass-outline"
                              size={20}
                              color="#999"
                            />
                            <Text
                              style={[
                                styles.noDonorText,
                                isDark ? styles.textMutedDark : undefined,
                              ]}
                            >
                              {t("patientHome.waitingForAssignment")}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          )}

          {activeSection === "history" && (
            <Animated.View
              style={[
                styles.sectionAnimated,
                {
                  opacity: sectionAnim,
                  transform: [
                    {
                      translateY: sectionAnim.interpolate({
                        inputRange: [0.85, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.sectionTitle}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={isDark ? "#e5e7eb" : "#333"}
                />{" "}
                {t("patientHome.historyTitle")}
              </Text>

              {appointmentHistory.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="time-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {t("patientHome.noHistory")}
                  </Text>
                </View>
              ) : (
                <View style={styles.cardList}>
                  {appointmentHistory.map((appt) => {
                    const donor = getDonorInfo(appt);
                    return (
                      <View
                        key={appt.id}
                        style={[
                          styles.historyCard,
                          isDark ? styles.historyCardDark : undefined,
                        ]}
                      >
                        <View style={styles.historyHeader}>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#66BB6A"
                          />
                          <Text
                            style={[
                              styles.historyDate,
                              isDark ? styles.textPrimaryDark : undefined,
                            ]}
                          >
                            {formatDate(appt.date)}
                          </Text>
                        </View>
                        {donor && (
                          <Text
                            style={[
                              styles.historyText,
                              isDark ? styles.textMutedDark : undefined,
                            ]}
                          >
                            {t("patientHome.donor")}: {donor.name} (
                            {donor.blood_group})
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Bottom Navigation */}
      <View
        style={[styles.bottomNav, isDark ? styles.bottomNavDark : undefined]}
      >
        <Ionicons name="home" size={24} color="#D86C6C" />
        <Ionicons
          name="calendar"
          size={24}
          color={isDark ? "#94a3b8" : "#888"}
        />
        <Ionicons name="person" size={24} color={isDark ? "#94a3b8" : "#888"} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* ── Layout ── */
  safeContainer: {
    flex: 1,
    backgroundColor: "#EFEDE8",
  },
  safeContainerDark: {
    backgroundColor: "#0F131A",
  },
  container: {
    flex: 1,
    backgroundColor: "#EFEDE8",
  },
  containerDark: {
    backgroundColor: "#0F131A",
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 80,
  },

  /* ── Patient hero card (blue gradient) ── */
  welcomeCard: {
    marginBottom: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#1A5CC8",
    overflow: "hidden",
    position: "relative",
  },
  welcomeCardDark: {
    backgroundColor: "#0D3278",
  },
  heroDeco1: {
    position: "absolute",
    right: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroDeco2: {
    position: "absolute",
    right: 20,
    bottom: -28,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  heroAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroAvatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  heroName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  heroDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  heroStatsRow: {
    flexDirection: "row",
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 12,
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
  },
  heroStatBorder: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.2)",
  },
  heroStatNum: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  heroStatLbl: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },

  /* ── Section tabs ── */
  sectionTabs: {
    flexDirection: "row",
    gap: 0,
    marginBottom: 10,
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

  /* Misc ── */
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 4,
    color: "#1A1917",
  },
  cardList: {
    gap: 8,
    marginBottom: 14,
  },
  sectionAnimated: {
    marginBottom: 4,
  },

  /* ── Appointment cards ── */
  appointmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: "rgba(46,45,42,.14)",
  },
  appointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  appointmentDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1917",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  donorInfo: {
    backgroundColor: "#F4F3F0",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  donorInfoDark: {
    backgroundColor: "#111827",
  },
  donorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  donorLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8E8C84",
    marginLeft: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  donorName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C0193A",
    marginBottom: 6,
  },
  donorDetails: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 6,
  },
  donorDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  donorDetailText: {
    fontSize: 12,
    color: "#8E8C84",
  },
  arrivalInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(46,45,42,.12)",
  },
  arrivalInfoDark: {
    borderTopColor: "rgba(148,163,184,.14)",
  },
  arrivalText: {
    fontSize: 12,
    color: "#5A5852",
    fontWeight: "500",
  },
  noDonorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#F4F3F0",
    borderRadius: 10,
    marginTop: 8,
  },
  noDonorInfoDark: {
    backgroundColor: "#111827",
  },
  noDonorText: {
    fontSize: 13,
    color: "#8E8C84",
    fontStyle: "italic",
  },

  /* ── Linked pool ── */
  linkedPoolCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "rgba(46,45,42,.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  linkedPoolHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  linkedPoolName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1917",
  },
  linkedPoolMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  linkedPoolBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F4F3F0",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  linkedPoolBadgeDark: {
    backgroundColor: "#1C2333",
    borderWidth: 0.5,
    borderColor: "rgba(148,163,184,.14)",
  },
  linkedPoolMetaText: {
    fontSize: 11,
    color: "#5A5852",
    fontWeight: "600",
  },

  /* ── Alerts ── */
  unlinkedAlertCard: {
    backgroundColor: "#FFF7EB",
    borderColor: "rgba(245,166,35,.3)",
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  unlinkedAlertCardDark: {
    backgroundColor: "#1E180A",
    borderColor: "rgba(245,166,35,.2)",
  },
  unlinkedAlertTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#C07B00",
    marginBottom: 4,
  },
  unlinkedAlertTitleDark: {
    color: "#F5A623",
  },
  unlinkedAlertText: {
    fontSize: 12,
    color: "#7A4D00",
    lineHeight: 18,
  },
  unlinkedAlertTextDark: {
    color: "#F5C67A",
  },

  /* ── Empty state ── */
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#8E8C84",
    marginTop: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 12,
    color: "#B4B2AA",
    marginTop: 4,
    textAlign: "center",
  },

  /* ── History ── */
  historyCard: {
    backgroundColor: "#EEF5FF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "rgba(74,142,240,.2)",
  },
  historyCardDark: {
    backgroundColor: "#0D1B33",
    borderColor: "rgba(74,142,240,.15)",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  historyDate: {
    fontWeight: "600",
    color: "#1A1917",
    fontSize: 13,
  },
  historyText: {
    fontSize: 12,
    color: "#5A5852",
    marginLeft: 28,
  },
  calendarButtonsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(46,45,42,.1)",
    flexDirection: "row",
    gap: 8,
  },

  /* ── Book button ── */
  bookButton: {
    backgroundColor: "#F03E5E",
    padding: 13,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  bookButtonDark: {
    backgroundColor: "#C0193A",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  /* ── Bottom nav ── */
  bottomNav: {
    height: 60,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopColor: "rgba(46,45,42,.14)",
    borderTopWidth: 0.5,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  bottomNavDark: {
    backgroundColor: "#141922",
    borderTopColor: "rgba(148,163,184,.14)",
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

  /* ── Legacy stubs (kept for JSX refs) ── */
  welcomeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  hello: { fontSize: 20, fontWeight: "700", color: "#1A1917" },
  date: { fontSize: 12, color: "#8E8C84", marginTop: 2 },
  time: { fontSize: 11, color: "#8E8C84" },
  profileStatus: { alignItems: "center" },
  profileStatusBadge: { backgroundColor: "rgba(255,255,255,0.65)", color: "#5A5852", fontSize: 11, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 6, fontWeight: "600" },
  profileStatusBadgeDark: { backgroundColor: "rgba(15, 23, 42, 0.45)" },
  profileImage: { width: 36, height: 36, borderRadius: 18 },
  summaryStrip: { flexDirection: "row", gap: 8 },
  summaryCard: { flex: 1, backgroundColor: "rgba(255,255,255,0.72)", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  summaryCardDark: { backgroundColor: "rgba(15,23,42,0.32)" },
  summaryValue: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  /* ── Linked donor avatar card (new Claude design) ── */
  donorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  donorAvatarText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  donorMetaText: {
    fontSize: 11,
    color: "#8E8C84",
    marginTop: 2,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
    flexShrink: 0,
  },
  statusPillActive: {
    backgroundColor: "#E6F8F3",
  },
  statusPillIdle: {
    backgroundColor: "#F4F3F0",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22B07A",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusPillTextActive: {
    color: "#0F7A54",
  },
  statusPillTextIdle: {
    color: "#5A5852",
  },
  summaryLabel: { marginTop: 2, fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.7)", textTransform: "uppercase" },
});