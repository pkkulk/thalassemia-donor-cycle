import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useI18n } from "@/lib/i18n";
import { useThemeMode } from "@/lib/theme";

export default function ThemeSwitcher() {
  const { t } = useI18n();
  const { mode, setMode, isDark } = useThemeMode();
  const toggleAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(toggleAnim, {
      toValue: isDark ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 90,
    }).start();
  }, [isDark, toggleAnim]);

  const activeThemeLabel =
    mode === "system"
      ? t("common.themeSystem")
      : isDark
        ? t("common.themeDark")
        : t("common.themeLight");

  const pressScale = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1],
  });

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <Pressable
        onPress={() => setMode(isDark ? "light" : "dark")}
        onLongPress={() => setMode("system")}
        style={[styles.button, isDark ? styles.buttonDark : undefined]}
      >
        <Ionicons
          name={isDark ? "moon" : "sunny"}
          size={15}
          color={isDark ? "#e2e8f0" : "#7a5a5a"}
        />
        <Text style={[styles.label, isDark ? styles.labelDark : undefined]}>
          {activeThemeLabel}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: "#f2dfdc",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  buttonDark: {
    borderColor: "#334155",
    backgroundColor: "rgba(15,23,42,0.94)",
  },
  label: {
    fontSize: 12,
    color: "#8d7070",
    fontWeight: "800",
  },
  labelDark: {
    color: "#94a3b8",
  },
});
