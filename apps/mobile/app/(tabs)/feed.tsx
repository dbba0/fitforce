import React, { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/hooks";
import { apiRequest } from "@/lib/query-client";
import { Avatar, Badge, FeedbackToast, PrimaryButton, SectionLabel } from "@/components/ui";
import { Typography } from "@/constants/typography";

type ActivityType = "run" | "ride" | "walk" | "workout";

type ActivityUser = {
  id?: string;
  displayName?: string;
  avatarUrl?: string | null;
};

type FeedActivity = {
  id: string;
  type: ActivityType;
  title: string;
  startedAt?: string | null;
  durationSeconds?: number;
  distanceMeters?: number;
  avgPaceSecPerKm?: number;
  kudosCount?: number;
  likedByMe?: boolean;
  user?: ActivityUser | null;
};

type FeedResponse = {
  activities: FeedActivity[];
};

type ActivityOverride = {
  likedByMe: boolean;
  kudosCount: number;
};

const DATA_SURFACE = "#1A1A1A";

function getInitials(name: string): string {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDistance(meters: number): string {
  if (meters <= 0) return "0.00 km";
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 min";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${Math.max(1, minutes)} min`;
}

function formatPace(secondsPerKm: number | undefined): string {
  if (!secondsPerKm || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "-- /km";
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} /km`;
}

function formatDate(dateIso: string | undefined | null, todayLabel: string, yesterdayLabel: string): string {
  if (!dateIso) return "-";
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return "-";

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (target.getTime() === today.getTime()) return todayLabel;
  if (target.getTime() === yesterday.getTime()) return yesterdayLabel;
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short" }).format(date);
}

function PulseSkeletons() {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.skeletonWrap, { opacity }]}>
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonCard} />
      <View style={styles.skeletonCard} />
    </Animated.View>
  );
}

function GuestPrompt() {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.guestContent,
          { paddingTop: Platform.OS === "web" ? webTopPadding + 16 : insets.top + 16 },
        ]}
      >
        <View style={[styles.guestIconWrap, { backgroundColor: DATA_SURFACE, borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={28} color={colors.textMuted} />
        </View>
        <Text style={[styles.guestTitle, { color: colors.text, fontFamily: Typography.titleStrong }]}>
          {t("loginToAccess")}
        </Text>
        <Text style={[styles.guestBody, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}>
          {t("guestModePrompt")}
        </Text>
        <PrimaryButton label={t("login")} onPress={() => logout()} style={styles.guestButton} />
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const { t } = useLanguage();
  const { isGuest } = useAuth();
  const { colors, layout } = useAppTheme();
  const insets = useSafeAreaInsets();
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const [optimisticById, setOptimisticById] = useState<Record<string, ActivityOverride>>({});
  const [pendingById, setPendingById] = useState<Record<string, boolean>>({});
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data, isLoading, isRefetching, refetch } = useQuery<FeedResponse>({
    queryKey: ["/api/activities/feed"],
    enabled: !isGuest,
  });

  const activities = useMemo(() => {
    const base = data?.activities ?? [];
    return base.map((activity) => {
      const override = optimisticById[activity.id];
      if (!override) return activity;
      return {
        ...activity,
        likedByMe: override.likedByMe,
        kudosCount: override.kudosCount,
      };
    });
  }, [data?.activities, optimisticById]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 1800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const refreshFeed = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleToggleKudos = async (activity: FeedActivity) => {
    if (pendingById[activity.id]) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const previousLiked = !!activity.likedByMe;
    const previousCount = activity.kudosCount ?? 0;

    setPendingById((prev) => ({ ...prev, [activity.id]: true }));
    setOptimisticById((prev) => ({
      ...prev,
      [activity.id]: {
        likedByMe: !previousLiked,
        kudosCount: Math.max(0, previousCount + (previousLiked ? -1 : 1)),
      },
    }));

    try {
      const res = await apiRequest("POST", `/api/activities/${activity.id}/kudos`);
      const payload = await res.json();
      const updated = payload?.activity as FeedActivity | undefined;
      setOptimisticById((prev) => ({
        ...prev,
        [activity.id]: {
          likedByMe: !!updated?.likedByMe,
          kudosCount: Number(updated?.kudosCount ?? 0),
        },
      }));
    } catch (error) {
      console.error("[Feed] Impossible de toggler le kudos", error);
      setOptimisticById((prev) => ({
        ...prev,
        [activity.id]: {
          likedByMe: previousLiked,
          kudosCount: previousCount,
        },
      }));
      setToastMessage(t("activityKudosToggleError"));
    } finally {
      setPendingById((prev) => ({ ...prev, [activity.id]: false }));
    }
  };

  if (isGuest) {
    return <GuestPrompt />;
  }

  const refreshing = isManualRefreshing || (!isLoading && isRefetching);
  const showSkeleton = isLoading && activities.length === 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 6,
          paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 104,
          paddingHorizontal: Math.max(layout.screenPadding, 16),
          gap: 12,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshFeed}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={DATA_SURFACE}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <SectionLabel>{t("activityFeedSectionLabel")}</SectionLabel>
            <Text style={[styles.title, { color: colors.text, fontFamily: Typography.titleStrong }]}>
              {t("activityFeedTitle")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}>
              {t("activityFeedSubtitle")}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const authorName = item.user?.displayName || t("activityAnonymousAthlete");
          const dateLabel = formatDate(item.startedAt, t("today"), t("yesterday"));
          const typeVariant =
            item.type === "run"
              ? "ember"
              : item.type === "ride"
                ? "sky"
                : item.type === "walk"
                  ? "mint"
                  : "gold";

          const typeLabel =
            item.type === "run"
              ? t("activityTypeRun")
              : item.type === "ride"
                ? t("activityTypeRide")
                : item.type === "walk"
                  ? t("activityTypeWalk")
                  : t("activityTypeWorkout");

          return (
            <Pressable
              onPress={() => {
                router.push(`/activity/${item.id}` as any);
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.93 : 1 }]}
            >
              <View style={[styles.card, { backgroundColor: DATA_SURFACE, borderColor: colors.border }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.authorBlock}>
                    <Avatar
                      name={authorName}
                      initials={getInitials(authorName)}
                      imageUri={item.user?.avatarUrl ?? undefined}
                      size={42}
                      mode="tint"
                      color={colors.accent}
                    />
                    <View style={styles.authorTextWrap}>
                      <Text
                        style={[styles.authorName, { color: colors.text, fontFamily: Typography.title }]}
                        numberOfLines={1}
                      >
                        {authorName}
                      </Text>
                      <Text
                        style={[styles.authorMeta, { color: colors.textMuted, fontFamily: Typography.bodyRegular }]}
                      >
                        {dateLabel}
                      </Text>
                    </View>
                  </View>
                  <Badge label={typeLabel} variant={typeVariant} />
                </View>

                <Text style={[styles.activityTitle, { color: colors.text, fontFamily: Typography.titleStrong }]}>
                  {item.title}
                </Text>

                <View style={[styles.metricsRow, { backgroundColor: DATA_SURFACE, borderColor: colors.border }]}>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.text, fontFamily: Typography.title }]}>
                      {formatDistance(item.distanceMeters ?? 0)}
                    </Text>
                    <Text
                      style={[styles.metricLabel, { color: colors.textMuted, fontFamily: Typography.labelTech }]}
                    >
                      {t("activityMetricDistance")}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.text, fontFamily: Typography.title }]}>
                      {formatDuration(item.durationSeconds ?? 0)}
                    </Text>
                    <Text
                      style={[styles.metricLabel, { color: colors.textMuted, fontFamily: Typography.labelTech }]}
                    >
                      {t("activityMetricDuration")}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={[styles.metricValue, { color: colors.text, fontFamily: Typography.title }]}>
                      {formatPace(item.avgPaceSecPerKm)}
                    </Text>
                    <Text
                      style={[styles.metricLabel, { color: colors.textMuted, fontFamily: Typography.labelTech }]}
                    >
                      {t("activityMetricPace")}
                    </Text>
                  </View>
                </View>

                <View style={styles.kudosRow}>
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation?.();
                      void handleToggleKudos(item);
                    }}
                    disabled={pendingById[item.id]}
                    style={({ pressed }) => [
                      styles.kudosButton,
                      {
                        borderColor: colors.border,
                        backgroundColor: item.likedByMe ? `${colors.accent}22` : DATA_SURFACE,
                        opacity: pressed || pendingById[item.id] ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.kudosText,
                        {
                          color: item.likedByMe ? colors.accent : colors.textSecondary,
                          fontFamily: Typography.bodySemiBold,
                        },
                      ]}
                    >
                      {`${item.likedByMe ? "🔥" : "👏"} ${item.kudosCount ?? 0}`}
                    </Text>
                  </Pressable>
                  <Text style={[styles.kudosLabel, { color: colors.textMuted, fontFamily: Typography.bodyRegular }]}>
                    {t("activityKudosLabel")}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          showSkeleton ? (
            <PulseSkeletons />
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: Typography.titleStrong }]}>
                {t("feedEmptyFollowTitle")}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}>
                {t("feedEmptyFollowSubtitle")}
              </Text>
              <PrimaryButton
                label={t("feedExploreAthletes")}
                onPress={() => router.push("/users/explore" as any)}
                style={styles.exploreButton}
              />
              <PulseSkeletons />
            </View>
          )
        }
      />

      <FeedbackToast
        message={toastMessage}
        tone="error"
        style={{ bottom: Math.max(insets.bottom, 12) + 78 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerWrap: {
    gap: 8,
    marginBottom: 6,
  },
  title: {
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -1.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  authorBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  authorTextWrap: {
    flex: 1,
    gap: 2,
  },
  authorName: {
    fontSize: 17,
    lineHeight: 21,
  },
  authorMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  activityTitle: {
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.6,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 10,
  },
  metricItem: {
    flex: 1,
    gap: 2,
  },
  metricValue: {
    fontSize: 16,
    lineHeight: 20,
  },
  metricLabel: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  kudosRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  kudosButton: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 36,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  kudosText: {
    fontSize: 14,
    lineHeight: 18,
  },
  kudosLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  skeletonWrap: {
    gap: 12,
  },
  skeletonCard: {
    height: 148,
    borderRadius: 12,
    backgroundColor: DATA_SURFACE,
  },
  emptyState: {
    paddingTop: 28,
    paddingBottom: 16,
    gap: 10,
  },
  emptyTitle: {
    textAlign: "center",
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  exploreButton: {
    marginTop: 6,
  },
  guestContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  guestIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  guestTitle: {
    fontSize: 26,
    lineHeight: 30,
    textAlign: "center",
  },
  guestBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
  },
  guestButton: {
    width: 220,
    marginTop: 6,
  },
});
