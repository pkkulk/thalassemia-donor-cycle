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
  const isPatientRole = role === "patient";

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
    <View
      style={[
        styles.card,
        isPatientRole ? styles.cardPatient : undefined,
        isDark ? styles.cardDark : undefined,
      ]}
    >
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#D86C6C" />
          <Text style={[styles.meta, isDark ? styles.metaDark : undefined]}>
            Loading alerts...
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.stripTouchable}
          onPress={() => {
            if (unreadCount > 0) {
              void markAllRead();
            } else {
              void loadAlerts(true);
            }
          }}
        >
          <View
            style={[
              styles.stripDot,
              isPatientRole ? styles.stripDotPatient : undefined,
              isDark ? styles.stripDotDark : undefined,
            ]}
          />
          <Text
            style={[
              styles.stripText,
              isPatientRole ? styles.stripTextPatient : undefined,
              isDark ? styles.stripTextDark : undefined,
            ]}
            numberOfLines={2}
          >
            {items[0]
              ? `${items[0].title} · ${items[0].message}`
              : `No alerts right now · ${unreadLabel}`}
          </Text>
          {items[0] ? (
            <Text style={[styles.time, isDark ? styles.timeDark : undefined]}>
              {formatTimeAgo(items[0].created_at)}
            </Text>
          ) : null}
        </TouchableOpacity>
      )}

      {refreshing && !loading ? (
        <Text style={styles.refreshHint}>…</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ffe4b2",
    backgroundColor: "#fff7eb",
  },
  cardDark: {
    borderColor: "#334155",
    backgroundColor: "#1f2937",
  },
  cardPatient: {
    borderColor: "#dbeafe",
    backgroundColor: "#eff6ff",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stripTouchable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stripDot: {
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: "#f5a623",
    flexShrink: 0,
  },
  stripDotDark: {
    backgroundColor: "#60a5fa",
  },
  stripDotPatient: {
    backgroundColor: "#60a5fa",
  },
  stripText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#7a4d00",
    lineHeight: 22,
  },
  stripTextDark: {
    color: "#dbeafe",
  },
  stripTextPatient: {
    color: "#1e3a8a",
  },
  time: {
    fontSize: 11,
    color: "#64748b",
  },
  timeDark: {
    color: "#94a3b8",
  },
  meta: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
  },
  metaDark: {
    color: "#94a3b8",
  },
  refreshHint: {
    marginTop: 4,
    fontSize: 11,
    color: "#94a3b8",
  },
});
