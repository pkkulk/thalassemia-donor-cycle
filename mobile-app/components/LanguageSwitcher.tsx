import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { SUPPORTED_LANGUAGES, useI18n } from "@/lib/i18n";
import { useThemeMode } from "@/lib/theme";

const LANG_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  hi: "🇮🇳",
  mr: "🇮🇳",
  ta: "🇮🇳",
  gu: "🇮🇳",
};

const LANG_NATIVE: Record<string, string> = {
  en: "English",
  hi: "हिंदी",
  mr: "मराठी",
  ta: "தமிழ்",
  gu: "ગુજરાતી",
};

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  const { isDark } = useThemeMode();
  const [visible, setVisible] = useState(false);
  const useNativeBlur = Platform.OS === "ios";
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    cardAnim.setValue(0);
    Animated.spring(cardAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  }, [visible, cardAnim]);

  const closeModal = () => {
    Animated.timing(cardAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const handleSelect = (code: string) => {
    setLanguage(code as any);
    closeModal();
  };

  const activeFlag = LANG_FLAGS[language] ?? "🌐";
  const activeNative = LANG_NATIVE[language] ?? language;

  const bgPrimary = isDark ? "#141922" : "#FFFFFF";
  const bgSecondary = isDark ? "#1C2333" : "#F4F3F0";
  const borderColor = isDark ? "rgba(148,163,184,.18)" : "rgba(46,45,42,.14)";
  const textPrimary = isDark ? "#EEF1F4" : "#1A1917";
  const textSecondary = isDark ? "#A2ACB8" : "#5A5852";
  const textTertiary = isDark ? "#637082" : "#8E8C84";

  return (
    <View>
      {/* Trigger button — flag + abbreviated label */}
      <Pressable
        onPress={() => setVisible(true)}
        accessibilityLabel={`Language: ${activeNative}`}
        style={[
          styles.triggerChip,
          {
            backgroundColor: bgSecondary,
            borderColor: borderColor,
          },
        ]}
      >
        <Text style={styles.triggerFlag}>{activeFlag}</Text>
        <Text style={[styles.triggerLabel, { color: textSecondary }]}>
          {activeNative}
        </Text>
        <Text style={[styles.triggerCaret, { color: textTertiary }]}>▾</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <View style={styles.modalRoot}>
          {useNativeBlur ? (
            <BlurView
              intensity={isDark ? 28 : 36}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <Pressable
            style={[
              styles.backdrop,
              { backgroundColor: isDark ? "rgba(2,6,23,.45)" : "rgba(15,23,42,.25)" },
            ]}
            onPress={closeModal}
          />

          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: bgPrimary,
                borderColor: borderColor,
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [24, 0],
                    }),
                  },
                  {
                    scale: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: textPrimary }]}>
                  Choose Language
                </Text>
                <Text style={[styles.sheetSub, { color: textTertiary }]}>
                  Select your preferred language
                </Text>
              </View>
              <Pressable
                onPress={closeModal}
                style={[styles.closeBtn, { backgroundColor: bgSecondary, borderColor }]}
              >
                <Text style={{ fontSize: 14, color: textSecondary }}>✕</Text>
              </Pressable>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: borderColor }]} />

            {/* Language list */}
            <View style={styles.langList}>
              {SUPPORTED_LANGUAGES.map((entry) => {
                const isActive = entry.code === language;
                const flag = LANG_FLAGS[entry.code] ?? "🌐";
                const native = LANG_NATIVE[entry.code] ?? entry.label;
                return (
                  <Pressable
                    key={entry.code}
                    onPress={() => handleSelect(entry.code)}
                    style={[
                      styles.langItem,
                      {
                        backgroundColor: isActive ? (isDark ? "#2A0C12" : "#FFF0F3") : "transparent",
                        borderColor: isActive ? (isDark ? "#4A0F1E" : "#FFD6DE") : "transparent",
                      },
                    ]}
                  >
                    {/* Flag bubble */}
                    <View
                      style={[
                        styles.flagBubble,
                        {
                          backgroundColor: isActive
                            ? (isDark ? "#4A0F1E" : "#FFD6DE")
                            : bgSecondary,
                        },
                      ]}
                    >
                      <Text style={styles.flagEmoji}>{flag}</Text>
                    </View>

                    {/* Text */}
                    <View style={styles.langTextGroup}>
                      <Text
                        style={[
                          styles.langNative,
                          {
                            color: isActive
                              ? (isDark ? "#FF6B87" : "#C0193A")
                              : textPrimary,
                            fontWeight: isActive ? "700" : "500",
                          },
                        ]}
                      >
                        {native}
                      </Text>
                      <Text style={[styles.langEnglish, { color: textTertiary }]}>
                        {entry.label}
                      </Text>
                    </View>

                    {/* Active check */}
                    {isActive && (
                      <View style={styles.activeCheck}>
                        <Text style={styles.activeCheckText}>✓</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: borderColor }]}>
              <Pressable
                onPress={closeModal}
                style={[styles.cancelBtn, { backgroundColor: bgSecondary, borderColor }]}
              >
                <Text style={[styles.cancelText, { color: textSecondary }]}>Cancel</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  triggerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 0.5,
  },
  triggerFlag: {
    fontSize: 16,
    lineHeight: 20,
  },
  triggerLabel: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 64,
  },
  triggerCaret: {
    fontSize: 10,
    marginLeft: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 0.5,
    paddingTop: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 14,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  divider: {
    height: 0.5,
    marginHorizontal: 0,
  },
  langList: {
    padding: 10,
    gap: 4,
  },
  langItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 2,
  },
  flagBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  flagEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  langTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  langNative: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  langEnglish: {
    fontSize: 11,
    marginTop: 1,
  },
  activeCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#F03E5E",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  activeCheckText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "800",
  },
  footer: {
    padding: 14,
    borderTopWidth: 0.5,
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
