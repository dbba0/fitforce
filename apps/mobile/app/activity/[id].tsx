import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/hooks";
import { apiRequest } from "@/lib/query-client";
import { EmptyState, FeedbackToast, SectionLabel, SkeletonCard } from "@/components/ui";
import { Typography } from "@/constants/typography";

type ActivityType = "run" | "ride" | "walk" | "workout";

type ActivityUser = {
  id?: string;
  displayName?: string;
  avatarUrl?: string | null;
};

type ActivityKudo = {
  userId?: string;
  createdAt?: string | null;
  user?: ActivityUser | null;
};

type ActivityRoutePoint = {
  lat?: number;
  lng?: number;
  timestamp?: string | null;
};

type ActivityDetail = {
  id: string;
  type: ActivityType;
  title: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationSeconds?: number;
  distanceMeters?: number;
  avgPaceSecPerKm?: number;
  kudosCount?: number;
  likedByMe?: boolean;
  user?: ActivityUser | null;
  kudos?: ActivityKudo[];
  route?: ActivityRoutePoint[];
};

type ActivityResponse = {
  activity: ActivityDetail;
};

function formatTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return "0.00 km";
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatPace(secondsPerKm: number | undefined): string {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "--:--";
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDate(dateIso: string | undefined | null): string {
  if (!dateIso) return "-";
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTypeIcon(type: ActivityType): keyof typeof Ionicons.glyphMap {
  if (type === "run") return "walk-outline";
  if (type === "ride") return "bicycle-outline";
  if (type === "walk") return "footsteps-outline";
  return "barbell-outline";
}

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const activityId = Array.isArray(id) ? id[0] : id;
  const { t } = useLanguage();
  const { isGuest } = useAuth();
  const { colors, layout } = useAppTheme();
  const insets = useSafeAreaInsets();
  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const mapRef = useRef<MapView | null>(null);

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [likedByMe, setLikedByMe] = useState(false);
  const [kudosCount, setKudosCount] = useState(0);
  const [kudosList, setKudosList] = useState<ActivityKudo[]>([]);
  const [isTogglingKudos, setIsTogglingKudos] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data, isLoading, isRefetching, refetch } = useQuery<ActivityResponse>({
    queryKey: [activityId ? `/api/activities/${activityId}` : "/api/activities/unknown"],
    enabled: !isGuest && !!activityId,
  });

  const activity = data?.activity ?? null;

  useEffect(() => {
    if (!activity) return;
    setLikedByMe(!!activity.likedByMe);
    setKudosCount(Number(activity.kudosCount ?? 0));
    setKudosList(Array.isArray(activity.kudos) ? activity.kudos : []);
  }, [activity]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 1800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const routeCoordinates = useMemo(() => {
    if (!Array.isArray(activity?.route)) return [];
    return activity.route
      .map((point) => ({
        latitude: Number(point?.lat),
        longitude: Number(point?.lng),
      }))
      .filter(
        (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
      );
  }, [activity?.route]);

  useEffect(() => {
    if (!mapRef.current || routeCoordinates.length < 1) return;
    const frame = requestAnimationFrame(() => {
      mapRef.current?.fitToCoordinates(routeCoordinates, {
        edgePadding: { top: 36, right: 36, bottom: 36, left: 36 },
        animated: false,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [routeCoordinates]);

  const refreshActivity = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleToggleKudos = async () => {
    if (!activity || isTogglingKudos) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const previousLiked = likedByMe;
    const previousCount = kudosCount;
    setIsTogglingKudos(true);
    setLikedByMe(!previousLiked);
    setKudosCount(Math.max(0, previousCount + (previousLiked ? -1 : 1)));

    try {
      const res = await apiRequest("POST", `/api/activities/${activity.id}/kudos`);
      const payload = await res.json();
      const updated = payload?.activity as ActivityDetail | undefined;
      setLikedByMe(!!updated?.likedByMe);
      setKudosCount(Number(updated?.kudosCount ?? 0));
      setKudosList(Array.isArray(updated?.kudos) ? updated.kudos : []);
    } catch (error) {
      console.error("[Activity Detail] Impossible de toggler le kudos", error);
      setLikedByMe(previousLiked);
      setKudosCount(previousCount);
      setToastMessage(t("activityKudosToggleError"));
    } finally {
      setIsTogglingKudos(false);
    }
  };

  const activityTypeLabel = useMemo(() => {
    if (!activity) return "";
    if (activity.type === "run") return t("activityTypeRun");
    if (activity.type === "ride") return t("activityTypeRide");
    if (activity.type === "walk") return t("activityTypeWalk");
    return t("activityTypeWorkout");
  }, [activity, t]);

  const authorName = activity?.user?.displayName || t("activityAnonymousAthlete");
  const mapType = Platform.OS === "ios" ? "mutedStandard" : "standard";
  const firstPoint = routeCoordinates[0];
  const lastPoint = routeCoordinates[routeCoordinates.length - 1];

  if (isGuest) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.emptyWrap,
            { paddingTop: Platform.OS === "web" ? webTopPadding + 20 : insets.top + 20 },
          ]}
        >
          <EmptyState
            iconName="lock-closed-outline"
            title={t("loginToAccess")}
            description={t("guestModePrompt")}
          />
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}> 
        <View
          style={{
            paddingTop: Platform.OS === "web" ? webTopPadding : insets.top,
            paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24,
            gap: 12,
          }}
        >
          <SkeletonCard height={280} lines={1} style={{ borderRadius: 0 }} />
          <View style={{ paddingHorizontal: Math.max(layout.screenPadding, 16), gap: 12 }}>
            <SkeletonCard height={76} lines={2} />
            <SkeletonCard height={120} lines={3} />
            <SkeletonCard height={132} lines={3} />
          </View>
        </View>
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}> 
        <View
          style={[
            styles.emptyWrap,
            { paddingTop: Platform.OS === "web" ? webTopPadding + 20 : insets.top + 20 },
          ]}
        >
          <EmptyState
            iconName="alert-circle-outline"
            title={t("stateErrorTitle")}
            description={t("activityFeedLoadError")}
            actionLabel={t("activityFeedRefresh")}
            onActionPress={() => {
              void refreshActivity();
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}> 
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isManualRefreshing || isRefetching}
            onRefresh={refreshActivity}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.card}
          />
        }
        contentContainerStyle={{
          paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 26,
          gap: 12,
        }}
      >
        <View style={styles.mapSection}>
          {routeCoordinates.length > 0 ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              mapType={mapType as any}
              initialRegion={
                firstPoint
                  ? {
                      latitude: firstPoint.latitude,
                      longitude: firstPoint.longitude,
                      latitudeDelta: 0.03,
                      longitudeDelta: 0.03,
                    }
                  : undefined
              }
              showsCompass
              showsScale
              loadingEnabled
            >
              {routeCoordinates.length > 1 ? (
                <Polyline
                  coordinates={routeCoordinates}
                  strokeColor="#FF5500"
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                />
              ) : null}
              {firstPoint ? <Marker coordinate={firstPoint} pinColor="#22C55E" /> : null}
              {lastPoint ? <Marker coordinate={lastPoint} pinColor="#EF4444" /> : null}
            </MapView>
          ) : (
            <View style={styles.mapFallback}>
              <Text style={[styles.mapFallbackText, { fontFamily: Typography.bodySemiBold }]}> 
                {t("activityMapUnavailable")}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.mapTopOverlay,
              {
                paddingTop: Platform.OS === "web" ? webTopPadding + 8 : insets.top + 8,
                paddingHorizontal: Math.max(layout.screenPadding, 16),
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("activityBack")}
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                {
                  backgroundColor: "rgba(0,0,0,0.56)",
                  borderColor: "rgba(255,255,255,0.18)",
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        <View
          style={{
            paddingHorizontal: Math.max(layout.screenPadding, 16),
            gap: 12,
          }}
        >
          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: colors.text, fontFamily: Typography.titleStrong }]}>
              {activity.title}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name={getTypeIcon(activity.type)} size={14} color={colors.textSecondary} />
              <Text style={[styles.metaText, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}>
                {`${activityTypeLabel} · ${formatDate(activity.startedAt)}`}
              </Text>
            </View>
          </View>

          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: Typography.titleStrong }]}> 
                {formatDuration(activity.durationSeconds ?? 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: Typography.labelTech }]}> 
                {`⏱ ${t("activityMetricDuration").toUpperCase()}`}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: Typography.titleStrong }]}> 
                {formatDistance(activity.distanceMeters ?? 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: Typography.labelTech }]}> 
                {`📍 ${t("activityMetricDistance").toUpperCase()}`}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: Typography.titleStrong }]}> 
                {formatPace(activity.avgPaceSecPerKm)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: Typography.labelTech }]}> 
                {`⚡ ${t("activityMetricPace").toUpperCase()}`}
              </Text>
            </View>
          </View>

          <View style={[styles.separator, { backgroundColor: "#2A2A2A" }]} />

          <View style={[styles.kudosCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.kudosHeader}>
              <SectionLabel>{t("activityKudosListTitle")}</SectionLabel>
              <Pressable
                onPress={() => {
                  void handleToggleKudos();
                }}
                disabled={isTogglingKudos}
                style={({ pressed }) => [
                  styles.kudosButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: likedByMe ? `${colors.accent}22` : colors.cardElevated,
                    opacity: pressed || isTogglingKudos ? 0.82 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.kudosButtonText,
                    {
                      color: likedByMe ? colors.accent : colors.textSecondary,
                      fontFamily: Typography.bodySemiBold,
                    },
                  ]}
                >
                  {`🔥 ${kudosCount}`}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                if (!activity.user?.id) return;
                router.push(`/users/${activity.user.id}` as any);
              }}
              disabled={!activity.user?.id}
              style={({ pressed }) => [
                styles.authorLink,
                {
                  opacity: pressed && activity.user?.id ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons name="person-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.authorLabel, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}> 
                {t("activityAuthorLabel")}
              </Text>
              <Text style={[styles.authorNameLink, { color: colors.accent, fontFamily: Typography.bodySemiBold }]}>
                {authorName}
              </Text>
            </Pressable>

            {kudosList.length > 0 ? (
              <View style={styles.kudosList}>
                {kudosList.slice(0, 12).map((kudo, index) => {
                  const name = kudo.user?.displayName || t("activityAnonymousAthlete");
                  return (
                    <Text
                      key={`${kudo.userId ?? "kudo"}-${index}`}
                      style={[styles.kudoRowText, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}
                    >
                      {`• ${name}`}
                    </Text>
                  );
                })}
              </View>
            ) : kudosCount > 0 ? (
              <Text style={[styles.kudosFallbackText, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}> 
                {formatTemplate(t("activityKudosCountOnly"), { count: kudosCount })}
              </Text>
            ) : (
              <Text style={[styles.kudosFallbackText, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}> 
                {t("activityKudosEmpty")}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <FeedbackToast
        message={toastMessage}
        tone="error"
        style={{ bottom: Math.max(insets.bottom, 12) + 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  emptyWrap: {
    paddingHorizontal: 16,
  },
  mapSection: {
    height: 280,
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  mapFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  mapFallbackText: {
    color: "#A1A1AA",
    fontSize: 15,
    lineHeight: 20,
    textAlign: "center",
  },
  mapTopOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    gap: 6,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18,
  },
  statsCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minHeight: 72,
  },
  statValue: {
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.7,
  },
  statLabel: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  separator: {
    width: "100%",
    height: 1,
  },
  kudosCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  kudosHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  kudosButton: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  kudosButtonText: {
    fontSize: 13,
    lineHeight: 16,
  },
  authorLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorLabel: {
    fontSize: 13,
    lineHeight: 17,
  },
  authorNameLink: {
    fontSize: 13,
    lineHeight: 17,
  },
  kudosList: {
    gap: 6,
    marginTop: 2,
  },
  kudoRowText: {
    fontSize: 13,
    lineHeight: 17,
  },
  kudosFallbackText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
