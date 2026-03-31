import { Platform, Pressable, StatusBar, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { useThemeMode } from "@/lib/theme";

export default function TopControls({ onLogout }: { onLogout?: () => void }) {
  const { isDark } = useThemeMode();
  const topOffset =
    Platform.OS === "android"
      ? Math.max((StatusBar.currentHeight ?? 0) - 6, 4)
      : 6;

  return (
    <View style={[styles.row, { marginTop: topOffset }]}>
      <View style={styles.leftGroup}>
        <LanguageSwitcher />
        <ThemeSwitcher />
      </View>
      <View style={styles.rightGroup}>
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
              color={isDark ? "#fecaca" : "#fff"}
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
    marginBottom: 14,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutIconButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    width: 34,
    height: 34,
    backgroundColor: "#B45353",
  },
  logoutIconButtonDark: {
    backgroundColor: "#7f1d1d",
    borderWidth: 1,
    borderColor: "#b91c1c",
  },
});
