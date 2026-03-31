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
  >("upcoming");
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
          <TopControls onLogout={handleLogout} />
          <AlertsPanel
            role="patient"
            recipientId={patient?.id || null}
            isDark={isDark}
          />

          {/* Profile Summary Card */}
          <View
            style={[
              styles.welcomeCard,
              isDark ? styles.welcomeCardDark : undefined,
            ]}
          >
            <View style={styles.welcomeHeader}>
              <View>
                <Text
                  style={[
                    styles.hello,
                    isDark ? styles.textPrimaryDark : undefined,
                  ]}
                >
                  {t("patientHome.hello")},{" "}
                  {patient?.name || t("patientHome.userFallback")}!
                </Text>
                <Text
                  style={[
                    styles.date,
                    isDark ? styles.textMutedDark : undefined,
                  ]}
                >
                  {new Date().toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <View style={styles.profileStatus}>
                <Text
                  style={[
                    styles.profileStatusBadge,
                    isDark ? styles.profileStatusBadgeDark : undefined,
                  ]}
                >
                  {t("patientHome.active")}
                </Text>
                <Image
                  source={require("../assets/logo.png")}
                  style={styles.profileImage}
                />
              </View>
            </View>

            <View style={styles.summaryStrip}>
              <View
                style={[
                  styles.summaryCard,
                  isDark ? styles.summaryCardDark : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.summaryValue,
                    isDark ? styles.textPrimaryDark : undefined,
                  ]}
                >
                  {linkedDonors.length}
                </Text>
                <Text
                  style={[
                    styles.summaryLabel,
                    isDark ? styles.textMutedDark : undefined,
                  ]}
                >
                  {t("patientHome.tab.pool")}
                </Text>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  isDark ? styles.summaryCardDark : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.summaryValue,
                    isDark ? styles.textPrimaryDark : undefined,
                  ]}
                >
                  {upcomingAppointments.length}
                </Text>
                <Text
                  style={[
                    styles.summaryLabel,
                    isDark ? styles.textMutedDark : undefined,
                  ]}
                >
                  {t("patientHome.tab.upcoming")}
                </Text>
              </View>
              <View
                style={[
                  styles.summaryCard,
                  isDark ? styles.summaryCardDark : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.summaryValue,
                    isDark ? styles.textPrimaryDark : undefined,
                  ]}
                >
                  {appointmentHistory.length}
                </Text>
                <Text
                  style={[
                    styles.summaryLabel,
                    isDark ? styles.textMutedDark : undefined,
                  ]}
                >
                  {t("patientHome.tab.history")}
                </Text>
              </View>
            </View>
          </View>

          {/* Book Appointment Button */}
          <TouchableOpacity
            style={[
              styles.bookButton,
              isDark ? styles.bookButtonDark : undefined,
            ]}
            onPress={() => router.push("book-appointment")}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.bookButtonText}>
              {t("patientHome.bookNew")}
            </Text>
          </TouchableOpacity>

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
                  {linkedDonors.map((donor) => (
                    <View
                      key={donor.id}
                      style={[
                        styles.linkedPoolCard,
                        isDark ? styles.surfaceCardDark : undefined,
                      ]}
                    >
                      <View style={styles.linkedPoolHeader}>
                        <Ionicons
                          name="person-circle"
                          size={22}
                          color="#D86C6C"
                        />
                        <Text
                          style={[
                            styles.linkedPoolName,
                            isDark ? styles.textPrimaryDark : undefined,
                          ]}
                        >
                          {donor.name}
                        </Text>
                      </View>
                      <View style={styles.linkedPoolMetaRow}>
                        <View
                          style={[
                            styles.linkedPoolBadge,
                            isDark ? styles.linkedPoolBadgeDark : undefined,
                          ]}
                        >
                          <Ionicons name="water" size={14} color="#666" />
                          <Text
                            style={[
                              styles.linkedPoolMetaText,
                              isDark ? styles.textMutedDark : undefined,
                            ]}
                          >
                            {donor.blood_group}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.linkedPoolBadge,
                            isDark ? styles.linkedPoolBadgeDark : undefined,
                          ]}
                        >
                          <Ionicons name="call" size={14} color="#666" />
                          <Text
                            style={[
                              styles.linkedPoolMetaText,
                              isDark ? styles.textMutedDark : undefined,
                            ]}
                          >
                            {donor.phone}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
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
                                appointmentId={parseInt(appt.id)}
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
  safeContainer: {
    flex: 1,
    backgroundColor: "#FFF5F5",
  },
  safeContainerDark: {
    backgroundColor: "#0b1220",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFF5F5",
    paddingHorizontal: 20,
  },
  containerDark: {
    backgroundColor: "#0b1220",
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  welcomeCard: {
    backgroundColor: "#FAD4D4",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  welcomeCardDark: {
    backgroundColor: "#1f2937",
  },
  hello: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2f2f2f",
  },
  welcomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  date: {
    fontSize: 13,
    color: "#8C6F6F",
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    color: "#999",
  },
  profileStatus: {
    alignItems: "center",
  },
  profileStatusBadge: {
    backgroundColor: "rgba(255,255,255,0.65)",
    color: "#8C6F6F",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
    fontWeight: "600",
  },
  profileStatusBadgeDark: {
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  summaryStrip: {
    flexDirection: "row",
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  summaryCardDark: {
    backgroundColor: "rgba(15,23,42,0.32)",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2f2f2f",
  },
  summaryLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    color: "#8C6F6F",
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 8,
    color: "#333",
  },
  sectionTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
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
  cardList: {
    gap: 12,
    marginBottom: 20,
  },
  sectionAnimated: {
    marginBottom: 4,
  },
  bookButton: {
    backgroundColor: "#D86C6C",
    padding: 14,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookButtonDark: {
    backgroundColor: "#ef4444",
  },
  bookButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  appointmentCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  donorInfo: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  donorInfoDark: {
    backgroundColor: "#111827",
  },
  donorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  donorLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginLeft: 6,
    textTransform: "uppercase",
  },
  donorName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D86C6C",
    marginBottom: 8,
  },
  donorDetails: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  donorDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  donorDetailText: {
    fontSize: 14,
    color: "#666",
  },
  arrivalInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  arrivalInfoDark: {
    borderTopColor: "#334155",
  },
  arrivalText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
  },
  noDonorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    marginTop: 8,
  },
  noDonorInfoDark: {
    backgroundColor: "#111827",
  },
  noDonorText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
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
  linkedPoolCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F2D5D5",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  linkedPoolHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  linkedPoolName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  linkedPoolMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  linkedPoolBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F7F7F7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkedPoolBadgeDark: {
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#334155",
  },
  linkedPoolMetaText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 12,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#BBB",
    marginTop: 4,
  },
  historyCard: {
    backgroundColor: "#FFEAEA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  historyCardDark: {
    backgroundColor: "#1f2937",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  historyDate: {
    fontWeight: "700",
    color: "#333",
    fontSize: 15,
  },
  historyText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 28,
  },
  calendarButtonsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    height: 60,
    width: "100%",
    backgroundColor: "#FFF",
    borderTopColor: "#eee",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  bottomNavDark: {
    backgroundColor: "#0f172a",
    borderTopColor: "#334155",
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
