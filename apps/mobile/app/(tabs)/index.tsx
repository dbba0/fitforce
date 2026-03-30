import React, { useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CompactStatCard,
  HeroWorkoutCard,
  SectionLabel,
  StreakChallengeCard,
  type WeekSlotState,
} from "@/components/ui";
import { Colors } from "@/constants/colors";
import { HomePremium } from "@/constants/homePremium";
import { Typography } from "@/constants/typography";
import { PROGRAMS, Program } from "@/data/programs";
import { TranslationKey } from "@/lib/i18n";

const HOME_SUGGESTED_XP = 120;

function getGreetingKey(): "goodMorning" | "goodAfternoon" | "goodEvening" {
  const hour = new Date().getHours();
  if (hour < 12) return "goodMorning";
  if (hour < 17) return "goodAfternoon";
  return "goodEvening";
}

function formatCompactNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
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

function buildWeeklySlots(
  completedSessions: number,
  targetSessions: number,
  streakDays: number
): { states: WeekSlotState[]; todayMark: string } {
  const target = Math.max(1, Math.min(7, targetSessions));
  const states: WeekSlotState[] = [];
  const completed = Math.min(completedSessions, target);
  for (let i = 0; i < target; i++) {
    if (i < completed) states.push("done");
    else if (completedSessions < targetSessions && i === completed) states.push("today");
    else states.push("todo");
  }
  return { states, todayMark: String(Math.max(0, streakDays)) };
}

export default function HomeScreen() {
  const { t } = useLanguage();
  const { profile, totalWorkouts, streakDays, weeklyChallenge, playerProgress, totalCalories } = useWorkout();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const palette = isDark ? HomePremium.dark : HomePremium.light;

  const displayName = user?.displayName || profile.name;
  const firstName = displayName.trim().split(" ")[0] || displayName;

  const featuredProgram = useMemo(
    () => PROGRAMS.find((p) => p.id === "home_full_body_intermediate") ?? PROGRAMS[0],
    []
  );

  const suggestedProgram = useMemo(() => {
    const alt = PROGRAMS.find((p) => p.id === "home_hiit") ?? PROGRAMS[1];
    if (alt && alt.id !== featuredProgram.id) return alt;
    return PROGRAMS.find((p) => p.id !== featuredProgram.id) ?? featuredProgram;
  }, [featuredProgram]);

  const weeklyCompleted = weeklyChallenge.completedSessions;
  const weeklyTarget = weeklyChallenge.targetSessions;
  const { states: weekSlots, todayMark } = buildWeeklySlots(weeklyCompleted, weeklyTarget, streakDays);

  const heroMeta = useMemo(() => {
    return `${featuredProgram.durationMin} ${t("minutes")} · ~${featuredProgram.caloriesPerSession} ${t("kcal")} · ${categoryLabel(featuredProgram, t)}`;
  }, [featuredProgram, t]);

  const startFeaturedSession = () => {
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/program/[id]", params: { id: suggestedProgram.id } });
  };

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const textPrimary = theme.text;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.screenBg }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      bounces
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 12,
        paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 96,
        paddingHorizontal: 20,
        flexGrow: 1,
      }}
    >
      <Animated.View entering={FadeInDown.duration(400)} style={styles.headerRow}>
        <View style={styles.headerTextCol}>
          <Text
            style={[styles.greetingUpper, { color: palette.textMuted, fontFamily: Typography.labelTech }]}
            maxFontSizeMultiplier={1.4}
          >
            {t(getGreetingKey())}
          </Text>
          <Text style={styles.headlineRow} maxFontSizeMultiplier={1.3}>
            <Text style={[styles.headlineName, { color: textPrimary, fontFamily: Typography.titleStrong }]}>
              {firstName}
            </Text>
            <Text style={[styles.headlineLevel, { color: palette.accent, fontFamily: Typography.titleStrong }]}>
              {` · ${t(playerProgress.levelNameKey)}`}
            </Text>
          </Text>
        </View>

        <Pressable
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          style={({ pressed }) => [
            styles.streakBadge,
            { backgroundColor: palette.streakBadgeBg, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Text style={[styles.streakBadgeText, { color: textPrimary, fontFamily: Typography.title }]}>
            🔥 {streakDays}
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.section}>
        <HeroWorkoutCard
          chipLabel={t("homeReadyTodayChip")}
          title={t(featuredProgram.nameKey as TranslationKey)}
          meta={heroMeta}
          primaryLabel={t("homeStartSessionPrimary")}
          secondaryLabel={t("homeChooseAnotherProgram")}
          palette={palette}
          textPrimary={textPrimary}
          onStart={startFeaturedSession}
          onChooseOther={openWorkouts}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.section}>
        <StreakChallengeCard
          streakTitle={formatTemplate(t("homeStreakInARow"), { days: streakDays })}
          challengeActionLabel={t("homeChallengeCta")}
          progressLine={formatTemplate(t("homeWeeklySessionsProgressLine"), {
            current: weeklyCompleted,
            target: weeklyTarget,
          })}
          progress={weeklyChallenge.progress}
          slots={weekSlots}
          todayMark={todayMark}
          palette={palette}
          textPrimary={textPrimary}
          onChallengePress={openFeed}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.statsRow}>
        <CompactStatCard
          label={t("homeStatLabelSessions")}
          value={formatCompactNumber(totalWorkouts)}
          palette={palette}
          valueAccent={false}
          textPrimary={textPrimary}
        />
        <CompactStatCard
          label={t("homeStatLabelKcal")}
          value={formatCompactNumber(totalCalories)}
          palette={palette}
          valueAccent
          textPrimary={textPrimary}
        />
        <CompactStatCard
          label={t("homeStatLabelXp")}
          value={formatCompactNumber(playerProgress.totalXp)}
          palette={palette}
          valueAccent
          textPrimary={textPrimary}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.suggestionSection}>
        <SectionLabel>{t("homeSuggestedForYou")}</SectionLabel>

        <Card
          onPress={openSuggestedProgram}
          borderLeftColor={palette.accent}
          style={[styles.suggestionCard, { backgroundColor: palette.card, borderColor: palette.borderSubtle }]}
        >
          <Text style={[styles.suggestedTitle, { color: textPrimary, fontFamily: Typography.titleStrong }]}>
            {t(suggestedProgram.nameKey as TranslationKey)}
          </Text>
          <Text style={[styles.suggestedMeta, { color: palette.textSecondary, fontFamily: Typography.body }]}>
            {`${suggestedProgram.durationMin} ${t("minutes")} · ~${suggestedProgram.caloriesPerSession} ${t("kcal")} · ${categoryLabel(suggestedProgram, t)}`}
          </Text>

          <View style={styles.tagRow}>
            <View style={[styles.diffTag, { borderColor: palette.borderSubtle, backgroundColor: `${palette.accent}14` }]}>
              <Text
                style={[styles.diffTagText, { color: palette.accentSoft, fontFamily: Typography.labelTech }]}
                maxFontSizeMultiplier={1.2}
              >
                {t(suggestedProgram.difficulty as TranslationKey)}
              </Text>
            </View>
            <Text style={[styles.xpTag, { color: palette.accent, fontFamily: Typography.bodySemiBold }]}>
              {formatTemplate(t("homeSuggestedXpReward"), { xp: HOME_SUGGESTED_XP })}
            </Text>
          </View>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    gap: 12,
  },
  headerTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  greetingUpper: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  headlineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
  },
  headlineName: {
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  headlineLevel: {
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  streakBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: "center",
  },
  streakBadgeText: {
    fontSize: 15,
  },
  section: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  suggestionSection: {
    gap: 10,
    marginBottom: 8,
  },
  suggestionCard: {
    borderRadius: 22,
    padding: 18,
    gap: 10,
    borderLeftWidth: 3,
    borderWidth: 1,
  },
  suggestedTitle: {
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.4,
  },
  suggestedMeta: {
    fontSize: 14,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  diffTag: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  diffTagText: {
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  xpTag: {
    fontSize: 14,
  },
});
