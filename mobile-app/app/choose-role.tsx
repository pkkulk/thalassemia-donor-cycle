import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useI18n } from "@/lib/i18n";
import { useThemeMode } from "@/lib/theme";
import TopControls from "@/components/TopControls";

export default function ChooseRoleScreen() {
  const [selected, setSelected] = useState<"donor" | "patient">("donor");
  const { t } = useI18n();
  const { isDark } = useThemeMode();

  const colors = {
    bg: isDark ? "#101217" : "#FFF5F5",
    textPrimary: isDark ? "#F3F4F6" : "#333",
    textSecondary: isDark ? "#C8CDD7" : "#555",
    accent: "#E76F51",
    roleBox: isDark ? "#1C2230" : "#FCEEEE",
    roleBoxSelected: isDark ? "#2A3245" : "#FFF0ED",
    signupButton: isDark ? "#B8746C" : "#D68C83",
    loginButton: isDark ? "#9C7E68" : "#c4a186",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <TopControls />
      <View style={styles.content}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {t("choose.heading")}
        </Text>
        <Text style={[styles.subheading, { color: colors.accent }]}>
          {t("choose.subheading")}
        </Text>

        <View style={styles.roleContainer}>
          <TouchableOpacity
            style={[
              styles.roleBox,
              { backgroundColor: colors.roleBox },
              selected === "donor" && styles.selectedBox,
              selected === "donor" && {
                backgroundColor: colors.roleBoxSelected,
              },
            ]}
            onPress={() => setSelected("donor")}
          >
            <Image source={require("../assets/logo.png")} style={styles.icon} />
            <Text style={[styles.roleText, { color: colors.textPrimary }]}>
              {t("choose.donor")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleBox,
              { backgroundColor: colors.roleBox },
              selected === "patient" && styles.selectedBox,
              selected === "patient" && {
                backgroundColor: colors.roleBoxSelected,
              },
            ]}
            onPress={() => setSelected("patient")}
          >
            <Image source={require("../assets/logo.png")} style={styles.icon} />
            <Text style={[styles.roleText, { color: colors.textPrimary }]}>
              {t("choose.patient")}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.signupText, { color: colors.textSecondary }]}>
          {t("choose.signupHere")}
        </Text>

        <TouchableOpacity
          style={[
            styles.signupButton,
            { backgroundColor: colors.signupButton },
          ]}
          onPress={() =>
            router.push({
              pathname: "signup",
              params: { role: selected },
            })
          }
        >
          <Text style={styles.buttonText}>{t("choose.signUp")}</Text>
        </TouchableOpacity>

        <Text style={[styles.loginPrompt, { color: colors.textSecondary }]}>
          {t("choose.alreadyRegistered")}
        </Text>

        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: colors.loginButton }]}
          onPress={() => router.push("login")}
        >
          <Text style={styles.buttonText}>{t("choose.login")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F5",
    paddingTop: 16,
    paddingHorizontal: 10,
  },
  content: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 140,
    height: 270,
    marginBottom: 10,
  },
  heading: {
    fontSize: 14,
    color: "#333",
    marginTop: 5,
  },
  subheading: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E76F51",
    marginBottom: 20,
  },
  roleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    width: "100%",
    paddingHorizontal: 16,
    marginBottom: 25,
  },
  roleBox: {
    backgroundColor: "#FCEEEE",
    flex: 1,
    maxWidth: 170,
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedBox: {
    borderColor: "#E76F51",
  },
  icon: {
    width: 50,
    height: 50,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  signupText: {
    fontSize: 14,
    color: "#555",
    marginTop: 60,
    marginBottom: 8,
  },
  signupButton: {
    backgroundColor: "#D68C83",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 12,
  },
  loginPrompt: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  loginButton: {
    backgroundColor: "#c4a186",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
