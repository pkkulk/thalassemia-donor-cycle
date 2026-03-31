import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type RecipientRole = "patient" | "donor";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

type AlertsPanelProps = {
  role: RecipientRole;
  recipientId: string | null;
  isDark: boolean;
  limit?: number;
};

const DEFAULT_LIMIT = 5;

function formatTimeAgo(value: string) {
  const dt = new Date(value).getTime();
  const now = Date.now();
  const diffMin = Math.max(1, Math.floor((now - dt) / 60000));

  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function AlertsPanel({
  role,
  recipientId,
  isDark,
  limit = DEFAULT_LIMIT,
}: AlertsPanelProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL;

  const idQueryKey = role === "patient" ? "patient_id" : "donor_id";

  const unreadLabel = useMemo(() => {
    if (unreadCount === 0) return "All caught up";
    if (unreadCount === 1) return "1 unread";
    return `${unreadCount} unread`;
  }, [unreadCount]);

  const loadAlerts = async (isPullRefresh = false) => {
    if (!recipientId || !backendUrl) {
      setLoading(false);
      setItems([]);
      setUnreadCount(0);
      return;
    }

    if (isPullRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const query = new URLSearchParams({
        role,
        [idQueryKey]: recipientId,
        limit: String(limit),
        offset: "0",
      });

      const response = await fetch(
        `${backendUrl}/api/notifications/timeline?${query.toString()}`,
      );

      if (!response.ok) {
        setItems([]);
        setUnreadCount(0);
        return;
      }

      const payload = await response.json();
      const notifications = (payload.notifications || []) as NotificationItem[];

      setItems(notifications);
      setUnreadCount(Number(payload.unread_count || 0));
    } catch (error) {
      // Keep alerts non-blocking when API is unreachable.
      setItems([]);
      setUnreadCount(0);
    } finally {
      if (isPullRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  const markAllRead = async () => {
    if (!recipientId || unreadCount === 0 || !backendUrl) return;

    try {
      await fetch(`${backendUrl}/api/notifications/mark-read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mark_all: true,
          role,
          [idQueryKey]: recipientId,
        }),
      });
      await loadAlerts(true);
    } catch (error) {
      // Keep UI stable if mark-read API is temporarily unavailable.
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [role, recipientId, limit]);

  return (
    <View style={[styles.card, isDark ? styles.cardDark : undefined]}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="notifications-outline"
            size={18}
            color={isDark ? "#e2e8f0" : "#1f2937"}
          />
          <Text style={[styles.title, isDark ? styles.titleDark : undefined]}>
            Alerts
          </Text>
          <View
            style={[
              styles.badge,
              unreadCount === 0 ? styles.badgeMuted : undefined,
            ]}
          >
            <Text style={styles.badgeText}>{unreadLabel}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => loadAlerts(true)}
            style={[
              styles.actionBtn,
              isDark ? styles.actionBtnDark : undefined,
            ]}
          >
            <Ionicons
              name="refresh"
              size={15}
              color={isDark ? "#cbd5e1" : "#334155"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={markAllRead}
            style={[
              styles.actionBtn,
              isDark ? styles.actionBtnDark : undefined,
            ]}
          >
            <Ionicons
              name="checkmark-done"
              size={15}
              color={isDark ? "#cbd5e1" : "#334155"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#D86C6C" />
          <Text style={[styles.meta, isDark ? styles.metaDark : undefined]}>
            Loading alerts...
          </Text>
        </View>
      ) : items.length === 0 ? (
        <Text style={[styles.meta, isDark ? styles.metaDark : undefined]}>
          No alerts right now.
        </Text>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <View
              key={item.id}
              style={[
                styles.alertItem,
                isDark ? styles.alertItemDark : undefined,
              ]}
            >
              <View style={styles.alertTitleRow}>
                <Text
                  style={[
                    styles.alertTitle,
                    isDark ? styles.alertTitleDark : undefined,
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.time, isDark ? styles.timeDark : undefined]}
                >
                  {formatTimeAgo(item.created_at)}
                </Text>
              </View>
              <Text
                style={[
                  styles.alertMessage,
                  isDark ? styles.alertMessageDark : undefined,
                ]}
                numberOfLines={2}
              >
                {item.message}
              </Text>
              {item.read_at ? null : <View style={styles.unreadDot} />}
            </View>
          ))}
        </View>
      )}

      {refreshing && !loading ? (
        <Text style={[styles.meta, isDark ? styles.metaDark : undefined]}>
          Refreshing...
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#f1d8d8",
    backgroundColor: "#fff7f7",
  },
  cardDark: {
    borderColor: "#334155",
    backgroundColor: "#0f172a",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f2937",
  },
  titleDark: {
    color: "#e2e8f0",
  },
  badge: {
    backgroundColor: "#fee2e2",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeMuted: {
    backgroundColor: "#e2e8f0",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7f1d1d",
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f1d8d8",
  },
  actionBtnDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  list: {
    gap: 8,
  },
  alertItem: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f5e4e4",
    position: "relative",
  },
  alertItemDark: {
    backgroundColor: "#111827",
    borderColor: "#334155",
  },
  alertTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  alertTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  alertTitleDark: {
    color: "#e5e7eb",
  },
  time: {
    fontSize: 11,
    color: "#64748b",
  },
  timeDark: {
    color: "#94a3b8",
  },
  alertMessage: {
    marginTop: 4,
    fontSize: 12,
    color: "#374151",
  },
  alertMessageDark: {
    color: "#cbd5e1",
  },
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 99,
    backgroundColor: "#ef4444",
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
  },
  metaDark: {
    color: "#94a3b8",
  },
});
