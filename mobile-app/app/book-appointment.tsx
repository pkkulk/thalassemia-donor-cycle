import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useThemeMode } from "@/lib/theme";
import TopControls from "@/components/TopControls";
interface PatientProfile {
  id: string;
  name: string;
  email: string;
  blood_group: string;
  phone: string;
  user_id: string;
}
interface ModalState {
  isVisible: boolean;
  message: string;
  isError: boolean;
}

export default function App() {
  const { t } = useI18n();
  const { isDark } = useThemeMode();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasApprovedPoolLink, setHasApprovedPoolLink] =
    useState<boolean>(false);

  // Default date to 4 days from now
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 4);
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [modal, setModal] = useState<ModalState>({
    isVisible: false,
    message: "",
    isError: false,
  });

  // 1. Fetch patient details on component mount using auth.uid()
  useEffect(() => {
    async function fetchPatient() {
      try {
        setLoading(true);
        // Get the current user session from Supabase Auth
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          // Fetch the patient's profile using the user's ID
          const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (error) throw error;
          if (!data) {
            await supabase.auth.signOut();
            setModal({
              isVisible: true,
              message:
                "Your patient profile no longer exists. Please log in again.",
              isError: true,
            });
            router.replace("choose-role");
            return;
          }
          setPatient(data);

          const { count: linkCount, error: linksError } = await supabase
            .from("patient_donor_links")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", data.id)
            .eq("status", "approved");

          if (linksError) throw linksError;
          setHasApprovedPoolLink((linkCount || 0) > 0);
        } else {
          // Handle case where user is not logged in
          setModal({
            isVisible: true,
            message: t("book.mustBeLoggedIn"),
            isError: true,
          });
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
        setModal({
          isVisible: true,
          message: t("book.failedLoadPatient"),
          isError: true,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchPatient();
  }, []);

  // Handle date changes from the date picker
  const onDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
    }
  };

  // Handle modal close - navigate back to patient home on success
  const handleModalClose = () => {
    const wasSuccess = !modal.isError;
    setModal({ ...modal, isVisible: false });

    if (wasSuccess) {
      router.back();
    }
  };

  // 5. On submit, insert into 'appointments' table
  const handleBookAppointment = async () => {
    if (!patient) {
      setModal({
        isVisible: true,
        message: t("book.patientNotLoaded"),
        isError: true,
      });
      return;
    }

    if (!hasApprovedPoolLink) {
      setModal({
        isVisible: true,
        message: t("book.noPoolMappedError"),
        isError: true,
      });
      return;
    }

    // Simple validation: check if the selected date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
    if (selectedDate < today) {
      setModal({
        isVisible: true,
        message: t("book.datePast"),
        isError: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: patient.id,
          date: selectedDate.toISOString().split("T")[0], // format date as 'YYYY-MM-DD'
          status: "Scheduled",
          donor_id: null,
        })
        .select();

      if (error) throw error;

      // 6. On success, show a message and reset state
      setModal({
        isVisible: true,
        message: `${t("book.successPrefix")} ${selectedDate.toDateString()}!`,
        isError: false,
      });
      // In a real app, you would navigate back to the appointments list here.
      // E.g., navigation.goBack();
      setSelectedDate(new Date());
    } catch (error) {
      console.error("Error booking appointment:", error);
      setModal({
        isVisible: true,
        message: t("book.failedBook"),
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, isDark ? styles.centeredDark : undefined]}>
        <ActivityIndicator
          size="large"
          color={isDark ? "#c4b5fd" : "#4a148c"}
        />
        <Text
          style={[
            styles.loadingText,
            isDark ? styles.loadingTextDark : undefined,
          ]}
        >
          {t("book.fetchingPatient")}
        </Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={[styles.centered, isDark ? styles.centeredDark : undefined]}>
        <Text
          style={[styles.errorText, isDark ? styles.errorTextDark : undefined]}
        >
          {t("book.couldNotLoadProfile")}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, isDark ? styles.safeAreaDark : undefined]}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <TopControls />
        <View style={styles.header}>
          <Text style={[styles.title, isDark ? styles.titleDark : undefined]}>
            {t("book.title")}
          </Text>
          <Text
            style={[styles.subtitle, isDark ? styles.subtitleDark : undefined]}
          >
            {t("book.welcome")}, {patient.name}. {t("book.subtitle")}
          </Text>
        </View>

        {/* 2. Display read-only patient details */}
        <View style={styles.readOnlyGroup}>
          <Text
            style={[
              styles.readOnlyLabel,
              isDark ? styles.readOnlyLabelDark : undefined,
            ]}
          >
            {t("book.patientName")}
          </Text>
          <Text
            style={[
              styles.readOnlyValue,
              isDark ? styles.readOnlyValueDark : undefined,
            ]}
          >
            {patient.name}
          </Text>
        </View>
        <View style={styles.readOnlyGroup}>
          <Text
            style={[
              styles.readOnlyLabel,
              isDark ? styles.readOnlyLabelDark : undefined,
            ]}
          >
            {t("book.bloodGroup")}
          </Text>
          <Text
            style={[
              styles.readOnlyValue,
              isDark ? styles.readOnlyValueDark : undefined,
            ]}
          >
            {patient.blood_group}
          </Text>
        </View>
        <View style={styles.readOnlyGroup}>
          <Text
            style={[
              styles.readOnlyLabel,
              isDark ? styles.readOnlyLabelDark : undefined,
            ]}
          >
            {t("book.phone")}
          </Text>
          <Text
            style={[
              styles.readOnlyValue,
              isDark ? styles.readOnlyValueDark : undefined,
            ]}
          >
            {patient.phone}
          </Text>
        </View>

        {/* 3. Date Picker for appointment date */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark ? styles.labelDark : undefined]}>
            {t("book.appointmentDate")}
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[
              styles.dateDisplay,
              isDark ? styles.dateDisplayDark : undefined,
              !hasApprovedPoolLink ? styles.dateDisplayDisabled : undefined,
            ]}
            disabled={!hasApprovedPoolLink}
          >
            <Text
              style={[
                styles.dateDisplayText,
                isDark ? styles.dateDisplayTextDark : undefined,
              ]}
            >
              {selectedDate.toDateString()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={new Date()} // Prevent selecting past dates
            />
          )}
        </View>

        {!hasApprovedPoolLink ? (
          <View
            style={[
              styles.unlinkedAlert,
              isDark ? styles.unlinkedAlertDark : undefined,
            ]}
          >
            <Text
              style={[
                styles.unlinkedAlertTitle,
                isDark ? styles.unlinkedAlertTitleDark : undefined,
              ]}
            >
              {t("book.noPoolMappedTitle")}
            </Text>
            <Text
              style={[
                styles.unlinkedAlertText,
                isDark ? styles.unlinkedAlertTextDark : undefined,
              ]}
            >
              {t("book.noPoolMappedDesc")}
            </Text>
          </View>
        ) : null}

        {/* Book Appointment Button */}
        <TouchableOpacity
          style={[
            styles.button,
            isDark ? styles.buttonDark : undefined,
            (isSubmitting || !hasApprovedPoolLink) && styles.buttonDisabled,
          ]}
          onPress={handleBookAppointment}
          disabled={isSubmitting || !hasApprovedPoolLink}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? t("book.booking") : t("book.bookAppointment")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modal.isVisible}
        onRequestClose={() => setModal({ ...modal, isVisible: false })}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              isDark ? styles.modalContentDark : undefined,
              modal.isError && styles.modalErrorContent,
            ]}
          >
            <Text
              style={[
                styles.modalText,
                isDark ? styles.modalTextDark : undefined,
              ]}
            >
              {modal.message}
            </Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                isDark ? styles.modalButtonDark : undefined,
                modal.isError && styles.modalErrorButton,
              ]}
              onPress={handleModalClose}
            >
              <Text style={styles.modalButtonText}>{t("book.ok")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  safeAreaDark: {
    backgroundColor: "#0f172a",
  },
  container: {
    padding: 20,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
  },
  centeredDark: {
    backgroundColor: "#0f172a",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#606060",
  },
  loadingTextDark: {
    color: "#cbd5e1",
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  errorTextDark: {
    color: "#fca5a5",
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a237e",
  },
  titleDark: {
    color: "#e2e8f0",
  },
  subtitle: {
    fontSize: 16,
    color: "#606060",
    marginTop: 5,
  },
  subtitleDark: {
    color: "#94a3b8",
  },
  readOnlyGroup: {
    marginBottom: 15,
  },
  readOnlyLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  readOnlyLabelDark: {
    color: "#cbd5e1",
  },
  readOnlyValue: {
    backgroundColor: "#e8eaf6",
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    color: "#1a237e",
    fontWeight: "500",
  },
  readOnlyValueDark: {
    backgroundColor: "#1e293b",
    color: "#e2e8f0",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  labelDark: {
    color: "#cbd5e1",
  },
  dateDisplay: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateDisplayDark: {
    backgroundColor: "#1e293b",
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: "#334155",
  },
  dateDisplayDisabled: {
    opacity: 0.55,
  },
  dateDisplayText: {
    fontSize: 16,
    color: "#333",
  },
  dateDisplayTextDark: {
    color: "#e2e8f0",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: Platform.OS === "ios" ? 15 : 10,
    paddingHorizontal: 20,
    fontSize: 16,
    color: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top", // For Android
  },
  button: {
    backgroundColor: "#4a148c",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDark: {
    backgroundColor: "#5b21b6",
  },
  buttonDisabled: {
    backgroundColor: "#9c27b0",
  },
  unlinkedAlert: {
    backgroundColor: "#fff3f3",
    borderColor: "#e57373",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  unlinkedAlertDark: {
    backgroundColor: "#3a1f1f",
    borderColor: "#ef9a9a",
  },
  unlinkedAlertTitle: {
    color: "#b71c1c",
    fontWeight: "700",
    marginBottom: 4,
  },
  unlinkedAlertTitleDark: {
    color: "#fecaca",
  },
  unlinkedAlertText: {
    color: "#7f1d1d",
    lineHeight: 20,
  },
  unlinkedAlertTextDark: {
    color: "#fee2e2",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContentDark: {
    backgroundColor: "#1e293b",
  },
  modalErrorContent: {
    backgroundColor: "#ffebee",
  },
  modalText: {
    marginBottom: 20,
    textAlign: "center",
    fontSize: 16,
    color: "#333",
  },
  modalTextDark: {
    color: "#e2e8f0",
  },
  modalButton: {
    backgroundColor: "#4a148c",
    borderRadius: 10,
    paddingHorizontal: 25,
    paddingVertical: 10,
  },
  modalButtonDark: {
    backgroundColor: "#6d28d9",
  },
  modalErrorButton: {
    backgroundColor: "#d32f2f",
  },
  modalButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
