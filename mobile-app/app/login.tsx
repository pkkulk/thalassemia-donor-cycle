import { useState } from "react";
import { router } from "expo-router";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useI18n } from "@/lib/i18n";
import { useThemeMode } from "@/lib/theme";
import TopControls from "@/components/TopControls";

export default function LoginScreen() {
  const { t } = useI18n();
  const { isDark } = useThemeMode();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const colors = {
    bg: isDark ? "#101217" : "#FFF5F5",
    textPrimary: isDark ? "#F3F4F6" : "#333",
    textSecondary: isDark ? "#C8CDD7" : "#555",
    label: isDark ? "#D5DBE5" : "#444",
    card: isDark ? "#1C2230" : "#FCEEEE",
    placeholder: isDark ? "#9099A7" : "#aaa",
    inputText: isDark ? "#F3F4F6" : "#000",
    icon: isDark ? "#BFC7D6" : "#888",
    accent: "#E76F51",
    button: isDark ? "#B8746C" : "#D68C83",
    backArrow: isDark ? "#C5837D" : "#E28D86",
    forgot: isDark ? "#F09595" : "#D26868",
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t("login.missingFieldsTitle"), t("login.missingFieldsDesc"));
      return;
    }

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      Alert.alert(t("login.failedTitle"), authError.message);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      Alert.alert(t("common.error"), t("login.userIdMissing"));
      return;
    }

    let destinationScreen = "patient-home";

    const { data: donorData, error: donorError } = await supabase
      .from("donor")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (donorError) {
      console.error("Error checking donor profile:", donorError);
    }

    if (donorData) {
      destinationScreen = "DonorDashboardScreen";
    }

    Alert.alert(t("login.successTitle"), t("login.successDesc"));
    router.replace(destinationScreen);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardContainer, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TopControls />
        <Text style={[styles.heading, { color: colors.textPrimary }]}>
          {t("login.welcome")}{" "}
          <Text style={[styles.highlight, { color: colors.accent }]}>
            {t("login.back")}
          </Text>
        </Text>

        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          {t("login.subtext")}
        </Text>

        <Text style={[styles.label, { color: colors.label }]}>
          {t("login.emailLabel")}
        </Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, color: colors.inputText },
          ]}
          value={email}
          onChangeText={setEmail}
          placeholder={t("login.emailPlaceholder")}
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={[styles.label, { color: colors.label }]}>
          {t("login.passwordLabel")}
        </Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.card, color: colors.inputText },
              { flex: 1, borderBottomRightRadius: 0, borderTopRightRadius: 0 },
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder={t("login.passwordPlaceholder")}
            placeholderTextColor={colors.placeholder}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={[styles.eyeIcon, { backgroundColor: colors.card }]}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color={colors.icon}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity>
          <Text style={[styles.forgotText, { color: colors.forgot }]}>
            {t("login.forgotPassword")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.button }]}
          onPress={handleLogin}
        >
          <Text style={styles.buttonText}>{t("common.continue")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backArrow}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back-circle"
            size={32}
            color={colors.backArrow}
          />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: "#FFF5F5",
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
  },
  heading: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    color: "#333",
    marginBottom: 4,
  },
  highlight: {
    color: "#E76F51",
  },
  subtext: {
    textAlign: "center",
    color: "#555",
    marginBottom: 24,
  },
  label: {
    marginBottom: 6,
    color: "#444",
    marginTop: 10,
  },
  input: {
    backgroundColor: "#FCEEEE",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    color: "#000",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  eyeIcon: {
    padding: 12,
    backgroundColor: "#FCEEEE",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  forgotText: {
    color: "#D26868",
    textAlign: "right",
    marginTop: 8,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#D68C83",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 30,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  backArrow: {
    alignSelf: "center",
    marginTop: 10,
  },
});
