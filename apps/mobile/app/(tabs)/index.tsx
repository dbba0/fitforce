import React, { useMemo } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonCard, StateCard } from "@/components/ui";
import {
  ContextualHeader,
  MiniStatCarousel,
  MotivationQuickStart,
} from "@/features/home";
import { useAppTheme } from "@/hooks";
import { PROGRAMS, Program } from "@/data/programs";
import { TranslationKey } from "@/lib/i18n";
import { HeroWorkoutCard, type MiniStatCardData } from "@/ui";

function getGreetingKey(): "goodMorning" | "goodAfternoon" | "goodEvening" {
  const hour = new Date().getHours();
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

function formatCompactNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

function formatTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}

function categoryLabel(program: Program, t: (k: TranslationKey) => string): string {
  return t(program.category as TranslationKey);
}

function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + delta);
  return copy;
}

export default function HomeScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    profile,
    streakDays,
    weeklyChallenge,
    weeklyProgress,
    sessions,
    isLoaded,
  } = useWorkout();
  const { colors, layout, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();

  const authDisplayName =
    typeof user?.displayName === "string" && user.displayName.trim().length > 0
      ? user.displayName.trim()
      : "";
  const profileDisplayName =
    typeof profile.name === "string" && profile.name.trim().length > 0
      ? profile.name.trim()
      : "";
  const displayName = authDisplayName || profileDisplayName || "Athlète";
  const firstName = displayName.split(/\s+/)[0] || "Athlète";

  const featuredProgram = useMemo(
    () => PROGRAMS.find((program) => program.id === "home_full_body_intermediate") ?? PROGRAMS[0] ?? null,
    []
  );

  const suggestedProgram = useMemo(() => {
    if (!featuredProgram) return PROGRAMS[0] ?? null;
    const alt = PROGRAMS.find((program) => program.id === "home_hiit") ?? PROGRAMS[1];
    if (alt && alt.id !== featuredProgram.id) return alt;
    return PROGRAMS.find((program) => program.id !== featuredProgram.id) ?? featuredProgram;
  }, [featuredProgram]);

  const weeklyVolumeMinutes = useMemo(() => {
    const currentWeekStart = startOfWeekMonday(new Date());
    return sessions.reduce((sum, session) => {
      if (!session.completed) return sum;
      const date = new Date(session.date);
      return date >= currentWeekStart ? sum + session.durationMin : sum;
    }, 0);
  }, [sessions]);

  const recentProgress = useMemo(() => {
    const recent = weeklyProgress.slice(-3).reduce((sum, value) => sum + value, 0);
    const previous = weeklyProgress.slice(-6, -3).reduce((sum, value) => sum + value, 0);
    if (recent === 0 && previous === 0) {
      return {
        value: t("homeMiniStatProgressStable"),
        trend: "neutral" as const,
        indicatorValue: 0.42,
      };
    }
    if (previous <= 0 && recent > 0) {
      return {
        value: formatTemplate(t("homeMiniStatProgressUp"), { pct: 100 }),
        trend: "up" as const,
        indicatorValue: 0.86,
      };
    }
    const delta = Math.round(((recent - previous) / Math.max(1, previous)) * 100);
    if (delta <= 0) {
      return {
        value: t("homeMiniStatProgressStable"),
        trend: "neutral" as const,
        indicatorValue: 0.45,
      };
    }
    return {
      value: formatTemplate(t("homeMiniStatProgressUp"), { pct: delta }),
      trend: "up" as const,
      indicatorValue: Math.max(0.45, Math.min(1, 0.5 + delta / 180)),
    };
  }, [weeklyProgress, t]);

  const startFeaturedSession = () => {
    if (!featuredProgram) {
      openWorkouts();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/session/[id]", params: { id: featuredProgram.id } });
  };

  const openWorkouts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/workouts");
  };

  const openFeed = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/feed");
  };

  const openSuggestedProgram = () => {
    if (!suggestedProgram) {
      openWorkouts();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/program/[id]", params: { id: suggestedProgram.id } });
  };

  const statItems = useMemo<MiniStatCardData[]>(
    () => [
      {
        id: "streak",
        title: t("homeMiniStatStreak"),
        value: `${streakDays}`,
        delta: streakDays > 0 ? `+${Math.min(streakDays, 7)}j` : undefined,
        helperText: formatTemplate(t("homeMiniStatStreakMeta"), { days: streakDays }),
        trend: streakDays > 0 ? "up" : "neutral",
        indicatorValue: Math.min(1, streakDays / 7),
        accentColor: colors.accent,
      },
      {
        id: "volume",
        title: t("homeMiniStatVolume"),
        value: `${formatCompactNumber(weeklyVolumeMinutes)}m`,
        helperText: formatTemplate(t("homeMiniStatVolumeMeta"), {
          sessions: weeklyChallenge.completedSessions,
        }),
        trend: weeklyVolumeMinutes > 0 ? "up" : "neutral",
        indicatorValue: weeklyChallenge.progress,
      },
      {
        id: "sessions",
        title: t("homeMiniStatSessions"),
        value: `${weeklyChallenge.completedSessions}/${weeklyChallenge.targetSessions}`,
        delta: `${Math.round(weeklyChallenge.progress * 100)}%`,
        helperText: t("homeMiniStatSessionsMeta"),
        trend: weeklyChallenge.progress > 0 ? "up" : "neutral",
        indicatorValue: weeklyChallenge.progress,
        accentColor: colors.success,
      },
      {
        id: "progress",
        title: t("homeMiniStatProgress"),
        value: recentProgress.value,
        helperText: t("homeMiniStatProgressMeta"),
        trend: recentProgress.trend,
        indicatorValue: recentProgress.indicatorValue,
      },
    ],
    [
      t,
      colors.accent,
      colors.success,
      streakDays,
      weeklyVolumeMinutes,
      weeklyChallenge.completedSessions,
      weeklyChallenge.targetSessions,
      weeklyChallenge.progress,
      recentProgress,
    ]
  );

  const contextMessage = streakDays > 0
    ? formatTemplate(t("homeContextStreak"), { days: streakDays })
    : t("homeContextStart");

  const motivationText = streakDays >= 3
    ? formatTemplate(t("homeMotivationStreak"), { days: streakDays })
    : t("homeMotivationDefault");
  const hasCompletedSessions = sessions.some((session) => session.completed);

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  if (!isLoaded) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 6,
          paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100,
          paddingHorizontal: Math.max(layout.screenPadding, 16),
          gap: spacing[2],
        }}
      >
        <SkeletonCard height={96} lines={3} />
        <SkeletonCard height={248} lines={4} />
        <View style={styles.homeSkeletonStats}>
          <SkeletonCard height={136} lines={3} style={styles.homeSkeletonStatCard} />
          <SkeletonCard height={136} lines={3} style={styles.homeSkeletonStatCard} />
          <SkeletonCard height={136} lines={3} style={styles.homeSkeletonStatCard} />
        </View>
        <SkeletonCard height={198} lines={4} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
      bounces
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 6,
        paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100,
        paddingHorizontal: Math.max(layout.screenPadding, 16),
        gap: spacing[2],
      }}
    >
      <Animated.View entering={FadeInDown.duration(360)}>
        <ContextualHeader
          greetingLabel={`${t("homeWelcomeBack")} · ${t(getGreetingKey())}`}
          firstName={firstName}
          contextMessage={contextMessage}
          streakDays={streakDays}
          onQuickAction={openFeed}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(380)}>
        <HeroWorkoutCard
          badgeLabel={t("homeTodaySession")}
          title={featuredProgram ? t(featuredProgram.nameKey as TranslationKey) : undefined}
          subtitle={
            featuredProgram
              ? `${featuredProgram.durationMin} ${t("minutes")} · ${t(
                  featuredProgram.difficulty as TranslationKey
                )} · ${categoryLabel(featuredProgram, t)}`
              : undefined
          }
          metaItems={
            featuredProgram
              ? [
                  {
                    label: t("homeHeroMetaDuration"),
                    value: `${featuredProgram.durationMin} ${t("minutes")}`,
                    icon: "time-outline",
                  },
                  {
                    label: t("homeHeroMetaLevel"),
                    value: t(featuredProgram.difficulty as TranslationKey),
                    icon: "barbell-outline",
                  },
                  {
                    label: t("homeHeroMetaFocus"),
                    value: categoryLabel(featuredProgram, t),
                    icon: "fitness-outline",
                  },
                ]
              : []
          }
          primaryCtaLabel={t("homeHeroCtaStart")}
          onPrimaryCtaPress={startFeaturedSession}
          secondaryCtaLabel={t("homeHeroCtaAlternate")}
          onSecondaryCtaPress={openWorkouts}
          isEmpty={!featuredProgram}
          emptyTitle={t("homeHeroEmptyTitle")}
          emptySubtitle={t("homeHeroEmptySubtitle")}
          emptyPrimaryCtaLabel={t("homeHeroEmptyCta")}
          onEmptyPrimaryCtaPress={openWorkouts}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(380)}>
        <MiniStatCarousel items={statItems} />
      </Animated.View>

      {hasCompletedSessions ? (
        <Animated.View entering={FadeInDown.delay(180).duration(380)}>
          <MotivationQuickStart
            motivationLabel={t("homeMotivationTitle")}
            motivationText={motivationText}
            quickStartLabel={t("homeQuickStartTitle")}
            primaryActionLabel={t("homeHeroCtaStart")}
            secondaryActionLabel={t("homeQuickStartSecondary")}
            onPrimaryAction={startFeaturedSession}
            onSecondaryAction={openSuggestedProgram}
          />
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.delay(180).duration(380)}>
          <StateCard
            title={t("homeStateNewTitle")}
            description={t("homeStateNewDescription")}
            actionLabel={t("homeStateNewAction")}
            onActionPress={openWorkouts}
            style={styles.homeStateCard}
          />
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  homeSkeletonStats: {
    flexDirection: "row",
    gap: 10,
  },
  homeSkeletonStatCard: {
    flex: 1,
  },
  homeStateCard: {
    borderRadius: 20,
  },
});
