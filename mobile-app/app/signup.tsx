import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";

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

type UserRole = "donor" | "patient";
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function SignupScreen() {
  const { t } = useI18n();
  const { isDark } = useThemeMode();
  const params = useLocalSearchParams();

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
  };

  const role =
    params.role === "donor" || params.role === "patient"
      ? (params.role as UserRole)
      : "patient";

  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showBloodGroupOptions, setShowBloodGroupOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [touched, setTouched] = useState({
    fullName: false,
    bloodGroup: false,
    phone: false,
    email: false,
    password: false,
  });
  const [serverFieldErrors, setServerFieldErrors] = useState({
    phone: "",
    email: "",
  });

  const normalizedEmail = email.trim().toLowerCase();
  const phoneDigits = phone.replace(/\D/g, "");
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  const clientFieldErrors = useMemo(
    () => ({
      fullName: fullName.trim() ? "" : t("signup.fullNameRequired"),
      bloodGroup: !bloodGroup.trim()
        ? t("signup.bloodGroupRequired")
        : !BLOOD_GROUP_OPTIONS.includes(bloodGroup)
          ? t("signup.invalidBloodGroup")
          : "",
      phone: !phoneDigits
        ? t("signup.phoneRequired")
        : phoneDigits.length !== 10
          ? t("signup.invalidPhone")
          : "",
      email: !normalizedEmail
        ? t("signup.emailRequired")
        : !emailRegex.test(normalizedEmail)
          ? t("signup.invalidEmail")
          : "",
      password: !password
        ? t("signup.passwordRequired")
        : password.length < 6
          ? t("signup.passwordMinLength")
          : "",
    }),
    [
      bloodGroup,
      emailRegex,
      fullName,
      normalizedEmail,
      password,
      phoneDigits,
      t,
    ],
  );

  const shouldShowError = (field: keyof typeof touched) =>
    submitAttempted || touched[field];

  const fullNameError = shouldShowError("fullName")
    ? clientFieldErrors.fullName
    : "";
  const bloodGroupError = shouldShowError("bloodGroup")
    ? clientFieldErrors.bloodGroup
    : "";
  const phoneError = shouldShowError("phone")
    ? clientFieldErrors.phone || serverFieldErrors.phone
    : "";
  const emailError = shouldShowError("email")
    ? clientFieldErrors.email || serverFieldErrors.email
    : "";
  const passwordError = shouldShowError("password")
    ? clientFieldErrors.password
    : "";

  const isFormValid = Object.values(clientFieldErrors).every((value) => !value);
  const isContinueDisabled = !isFormValid || isSubmitting;

  const markFieldTouched = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSignUp = async () => {
    setSubmitAttempted(true);

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setServerFieldErrors({ phone: "", email: "" });

    try {
      let userId: string | null = null;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (authError) {
        const authMessage = authError.message.toLowerCase();
        const alreadyExists =
          authMessage.includes("already") ||
          authMessage.includes("registered") ||
          authMessage.includes("exists");

        if (!alreadyExists) {
          Alert.alert(t("signup.failedTitle"), authError.message);
          return;
        }

        // Recovery path: user exists in Auth, so sign in and complete missing profile row.
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        if (signInError || !signInData.user?.id) {
          setServerFieldErrors((prev) => ({
            ...prev,
            email: t("signup.emailAlreadyRegistered"),
          }));
          return;
        }

        userId = signInData.user.id;
      } else {
        userId = authData.user?.id || null;
      }

      if (!userId) {
        Alert.alert(t("common.error"), t("signup.userMissing"));
        return;
      }

      const profileTableName = role === "donor" ? "donor" : "patients";

      const profilePayload = {
        name: fullName,
        email: normalizedEmail,
        blood_group: bloodGroup,
        phone: phoneDigits,
        user_id: userId,
      };

      const { data: existingProfile, error: existingProfileError } =
        await supabase
          .from(profileTableName)
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

      if (existingProfileError) {
        Alert.alert(t("signup.profileFailed"), existingProfileError.message);
        return;
      }

      if (existingProfile) {
        Alert.alert(
          t("signup.successTitle"),
          "Account and profile already exist. Please log in.",
        );
        router.replace("/login");
        return;
      }

      const { error: insertError } = await supabase
        .from(profileTableName)
        .insert(profilePayload);

      if (insertError) {
        const message = insertError.message.toLowerCase();
        const nextServerErrors = { phone: "", email: "" };
        let hasDuplicateFieldError = false;

        if (
          message.includes("phone") &&
          (message.includes("duplicate") || message.includes("unique"))
        ) {
          nextServerErrors.phone = t("signup.phoneAlreadyUsed");
          hasDuplicateFieldError = true;
        }

        if (
          message.includes("email") &&
          (message.includes("duplicate") || message.includes("unique"))
        ) {
          nextServerErrors.email = t("signup.emailAlreadyRegistered");
          hasDuplicateFieldError = true;
        }

        if (hasDuplicateFieldError) {
          setServerFieldErrors(nextServerErrors);
          return;
        }

        Alert.alert(t("signup.profileFailed"), insertError.message);
        return;
      }

      Alert.alert(t("signup.successTitle"), t("signup.successDesc"));
      router.replace("/login");
    } finally {
      setIsSubmitting(false);
    }
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
          {t("signup.welcome")}{" "}
          <Text style={[styles.highlight, { color: colors.accent }]}>
            {t("signup.appName")}
          </Text>
        </Text>

        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          {t("signup.asRole")}{" "}
          <Text style={{ fontWeight: "bold", color: colors.accent }}>
            {role.toUpperCase()}
          </Text>
          . {t("signup.fillDetails")}
        </Text>

        <Text style={[styles.label, { color: colors.label }]}>
          {t("signup.fullName")}
        </Text>
        <TextInput
          style={[
            styles.input,
            fullNameError ? styles.inputError : null,
            { backgroundColor: colors.card, color: colors.inputText },
          ]}
          placeholder={t("signup.fullNamePlaceholder")}
          placeholderTextColor={colors.placeholder}
          value={fullName}
          onChangeText={(value) => setFullName(value)}
          onBlur={() => markFieldTouched("fullName")}
        />
        {fullNameError ? (
          <Text style={styles.errorText}>{fullNameError}</Text>
        ) : null}

        <Text style={[styles.label, { color: colors.label }]}>
          {t("signup.bloodGroup")}
        </Text>
        <TouchableOpacity
          style={[
            styles.input,
            styles.selectInput,
            bloodGroupError ? styles.inputError : null,
            { backgroundColor: colors.card },
          ]}
          onPress={() => {
            setShowBloodGroupOptions((prev) => !prev);
            markFieldTouched("bloodGroup");
          }}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: bloodGroup ? colors.inputText : colors.placeholder,
              fontSize: 16,
            }}
          >
            {bloodGroup || t("signup.bloodGroupPlaceholder")}
          </Text>
          <Ionicons
            name={showBloodGroupOptions ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.icon}
          />
        </TouchableOpacity>
        {showBloodGroupOptions ? (
          <View style={[styles.optionsCard, { backgroundColor: colors.card }]}>
            {BLOOD_GROUP_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.optionItem}
                onPress={() => {
                  setBloodGroup(option);
                  setShowBloodGroupOptions(false);
                  markFieldTouched("bloodGroup");
                }}
              >
                <Text
                  style={{
                    color: colors.inputText,
                    fontWeight: bloodGroup === option ? "700" : "500",
                  }}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {bloodGroupError ? (
          <Text style={styles.errorText}>{bloodGroupError}</Text>
        ) : null}

        <Text style={[styles.label, { color: colors.label }]}>
          {t("signup.phone")}
        </Text>
        <TextInput
          style={[
            styles.input,
            phoneError ? styles.inputError : null,
            { backgroundColor: colors.card, color: colors.inputText },
          ]}
          placeholder={t("signup.phonePlaceholder")}
          placeholderTextColor={colors.placeholder}
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={(value) => {
            setPhone(value.replace(/\D/g, ""));
            if (serverFieldErrors.phone) {
              setServerFieldErrors((prev) => ({ ...prev, phone: "" }));
            }
          }}
          onBlur={() => markFieldTouched("phone")}
        />
        {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

        <Text style={[styles.label, { color: colors.label }]}>
          {t("signup.email")}
        </Text>
        <TextInput
          style={[
            styles.input,
            emailError ? styles.inputError : null,
            { backgroundColor: colors.card, color: colors.inputText },
          ]}
          placeholder={t("signup.emailPlaceholder")}
          placeholderTextColor={colors.placeholder}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (serverFieldErrors.email) {
              setServerFieldErrors((prev) => ({ ...prev, email: "" }));
            }
          }}
          onBlur={() => markFieldTouched("email")}
        />
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <Text style={[styles.label, { color: colors.label }]}>
          {t("signup.password")}
        </Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[
              styles.input,
              passwordError ? styles.inputError : null,
              { backgroundColor: colors.card, color: colors.inputText },
              { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 },
            ]}
            placeholder={t("signup.passwordPlaceholder")}
            placeholderTextColor={colors.placeholder}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            onBlur={() => markFieldTouched("password")}
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
        {passwordError ? (
          <Text style={styles.errorText}>{passwordError}</Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.button },
            isContinueDisabled ? styles.buttonDisabled : null,
          ]}
          onPress={handleSignUp}
          disabled={isContinueDisabled}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? t("signup.submitting") : t("common.continue")}
          </Text>
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
    paddingTop: 60,
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
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionsCard: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  optionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.35)",
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#D64545",
  },
  errorText: {
    color: "#D64545",
    fontSize: 12,
    marginTop: -2,
    marginBottom: 6,
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
  button: {
    backgroundColor: "#D68C83",
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 40,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
