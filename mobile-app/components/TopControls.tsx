import { Platform, Pressable, StatusBar, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { useThemeMode } from "@/lib/theme";

export default function TopControls({
  onLogout,
  title,
  subtitle,
}: {
  onLogout?: () => void;
  title?: string;
  subtitle?: string;
}) {
  const { isDark } = useThemeMode();
  const topOffset =
    Platform.OS === "android"
      ? (StatusBar.currentHeight ?? 24) + 8
      : 10;

  return (
    <View style={[styles.row, { marginTop: topOffset }]}>
      <View style={styles.leftGroup}>
        {title ? (
          <View>
            <Text style={[styles.title, isDark ? styles.titleDark : undefined]}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  isDark ? styles.subtitleDark : undefined,
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.controlsRow}>
            <LanguageSwitcher />
            <ThemeSwitcher />
          </View>
        )}
      </View>
      <View style={styles.rightGroup}>
        {title ? (
          <View style={styles.controlsRow}>
            <LanguageSwitcher />
            <ThemeSwitcher />
          </View>
        ) : null}
        {onLogout ? (
          <Pressable
            onPress={onLogout}
            style={[
              styles.logoutIconButton,
              isDark ? styles.logoutIconButtonDark : undefined,
            ]}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={isDark ? "#fecaca" : "#b91c1c"}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  leftGroup: {
    flex: 1,
    minWidth: 0,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  titleDark: {
    color: "#f8fafc",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  subtitleDark: {
    color: "#94a3b8",
  },
  logoutIconButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    width: 34,
    height: 34,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutIconButtonDark: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
  },
});
