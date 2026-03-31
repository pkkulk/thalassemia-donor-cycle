import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { SUPPORTED_LANGUAGES, useI18n } from "@/lib/i18n";
import { useThemeMode } from "@/lib/theme";

const ITEM_HEIGHT = 44;

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();
  const { isDark } = useThemeMode();
  const [visible, setVisible] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState(language);
  const useNativeBlur = Platform.OS === "ios";

  const listRef = useRef<FlatList<(typeof SUPPORTED_LANGUAGES)[number]>>(null);
  const cardAnim = useRef(new Animated.Value(0)).current;

  const selectedIndex = useMemo(
    () =>
      Math.max(
        0,
        SUPPORTED_LANGUAGES.findIndex((item) => item.code === language),
      ),
    [language],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    setPendingLanguage(language);

    cardAnim.setValue(0);
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }, 40);

    return () => clearTimeout(timer);
  }, [visible, selectedIndex, cardAnim, language]);

  const closeModal = () => {
    Animated.timing(cardAnim, {
      toValue: 0,
      duration: 170,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  const onWheelEnd = (offsetY: number) => {
    const nextIndex = Math.round(offsetY / ITEM_HEIGHT);
    const safeIndex = Math.min(
      Math.max(nextIndex, 0),
      SUPPORTED_LANGUAGES.length - 1,
    );
    const picked = SUPPORTED_LANGUAGES[safeIndex];
    if (picked) setPendingLanguage(picked.code);
  };

  const selectLanguage = () => {
    if (pendingLanguage !== language) {
      setLanguage(pendingLanguage);
    }
    closeModal();
  };

  const activeLanguageLabel =
    SUPPORTED_LANGUAGES.find((item) => item.code === language)?.label ||
    language;

  return (
    <View>
      <Pressable
        onPress={() => setVisible(true)}
        style={[
          styles.triggerButton,
          isDark ? styles.triggerButtonDark : undefined,
        ]}
      >
        <View style={styles.triggerLeft}>
          <Ionicons
            name="language-outline"
            size={16}
            color={isDark ? "#e2e8f0" : "#784f4f"}
          />
          <Text
            style={[styles.triggerMeta, isDark ? styles.textMuted : undefined]}
          >
            {activeLanguageLabel}
          </Text>
        </View>
        <Ionicons
          name="chevron-down"
          size={14}
          color={isDark ? "#94a3b8" : "#956868"}
        />
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
              intensity={isDark ? 26 : 34}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <Pressable
            style={[styles.backdrop, isDark ? styles.backdropDark : undefined]}
            onPress={closeModal}
          />
          <Animated.View
            style={[
              styles.sheet,
              isDark ? styles.sheetDark : undefined,
              {
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text
                style={[
                  styles.sheetTitle,
                  isDark ? styles.textLight : undefined,
                ]}
              >
                {t("common.language")}
              </Text>
              <Pressable
                style={[
                  styles.closeButton,
                  isDark ? styles.closeButtonDark : undefined,
                ]}
                onPress={closeModal}
              >
                <Ionicons
                  name="close"
                  size={16}
                  color={isDark ? "#e2e8f0" : "#6f4a4a"}
                />
              </Pressable>
            </View>

            <View style={styles.wheelShell}>
              <View
                pointerEvents="none"
                style={[
                  styles.wheelCenterHighlight,
                  isDark ? styles.wheelCenterHighlightDark : undefined,
                ]}
              />
              <FlatList
                ref={listRef}
                data={SUPPORTED_LANGUAGES}
                keyExtractor={(item) => item.code}
                showsVerticalScrollIndicator={false}
                getItemLayout={(_, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                contentContainerStyle={styles.wheelContent}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={(event) =>
                  onWheelEnd(event.nativeEvent.contentOffset.y)
                }
                renderItem={({ item }) => {
                  const active = item.code === pendingLanguage;
                  const itemIndex = SUPPORTED_LANGUAGES.findIndex(
                    (entry) => entry.code === item.code,
                  );
                  return (
                    <Pressable
                      style={styles.wheelItem}
                      onPress={() => {
                        setPendingLanguage(item.code);
                        listRef.current?.scrollToOffset({
                          offset: itemIndex * ITEM_HEIGHT,
                          animated: true,
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.wheelLabel,
                          isDark ? styles.wheelLabelDark : undefined,
                          active ? styles.wheelLabelActive : undefined,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            </View>

            <View style={styles.actionRow}>
              <Pressable
                onPress={closeModal}
                style={[
                  styles.actionButton,
                  isDark ? styles.actionButtonDark : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    isDark ? styles.textLight : undefined,
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={selectLanguage}
                style={styles.actionButtonPrimary}
              >
                <Text style={styles.actionTextPrimary}>Select</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  triggerButton: {
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
  triggerButtonDark: {
    borderColor: "#334155",
    backgroundColor: "rgba(15,23,42,0.94)",
  },
  triggerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  triggerMeta: {
    fontSize: 12,
    color: "#8d7070",
    fontWeight: "800",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.2)",
  },
  backdropDark: {
    backgroundColor: "rgba(2, 6, 23, 0.35)",
  },
  sheet: {
    width: "88%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 18,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  sheetDark: {
    backgroundColor: "#0f172a",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#6e4f4f",
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fdf1ef",
  },
  closeButtonDark: {
    backgroundColor: "#1f2937",
  },
  wheelShell: {
    height: ITEM_HEIGHT * 5,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  wheelContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  wheelCenterHighlight: {
    position: "absolute",
    left: 8,
    right: 8,
    top: ITEM_HEIGHT * 2,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "#f3bdb3",
    zIndex: 1,
  },
  wheelCenterHighlightDark: {
    backgroundColor: "rgba(148, 163, 184, 0.08)",
    borderColor: "#475569",
  },
  wheelItem: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelLabel: {
    fontSize: 17,
    color: "#8f7373",
    fontWeight: "600",
  },
  wheelLabelDark: {
    color: "#94a3b8",
  },
  wheelLabelActive: {
    color: "#d14b3f",
    fontSize: 18,
    fontWeight: "800",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  actionButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  actionButtonDark: {
    borderColor: "#334155",
    backgroundColor: "#0f172a",
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  actionButtonPrimary: {
    borderRadius: 10,
    backgroundColor: "#E76F51",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionTextPrimary: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
  textLight: {
    color: "#e2e8f0",
  },
  textMuted: {
    color: "#94a3b8",
  },
});
