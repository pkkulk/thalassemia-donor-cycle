import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
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

  const pressScale = toggleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1],
  });

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <Pressable
        onPress={() => setMode(isDark ? "light" : "dark")}
        onLongPress={() => setMode("system")}
        accessibilityLabel={
          mode === "system"
            ? t("common.themeSystem")
            : isDark
              ? t("common.themeDark")
              : t("common.themeLight")
        }
        style={[styles.button, isDark ? styles.buttonDark : undefined]}
      >
        <Ionicons
          name={isDark ? "moon" : "sunny"}
          size={15}
          color={isDark ? "#e2e8f0" : "#475569"}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    borderRadius: 17,
    width: 34,
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDark: {
    borderColor: "#334155",
    backgroundColor: "#0f172a",
  },
});
