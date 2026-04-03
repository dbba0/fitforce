import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { TranslationKey } from "@/lib/i18n";
import { Card, Chip, FeedbackToast, SkeletonCard, StateCard } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { PROGRAMS, Program } from "@/data/programs";

type Tab = "home" | "gym" | "cardio";

const TABS: { key: Tab; labelKey: TranslationKey }[] = [
  { key: "home", labelKey: "workoutsTabHome" },
  { key: "gym", labelKey: "workoutsTabGym" },
  { key: "cardio", labelKey: "workoutsTabCardio" },
];

const PROGRAM_PRIORITIES: Record<Tab, string[]> = {
  home: ["home_full_body_beginner", "home_hiit", "home_abs"],
  gym: ["gym_push", "gym_upper_body", "gym_beginner_strength"],
  cardio: ["gym_cardio_intermediate", "home_cardio_beginner", "gym_cardio_advanced"],
};

function formatTemplate(template: string, values: Record<string, number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}

function getProgramAccentColor(program: Program, themeAccent: string): string {
  if (program.difficulty === "advanced" || program.isCardio) return "#5EA8FF";
  if (program.difficulty === "beginner") return "#2DD4A0";
  return themeAccent;
}

function getProgramTitle(program: Program, t: (key: TranslationKey) => string): string {
  if (program.id === "gym_push") return t("workoutsProgramPushPullLegs");
  if (program.id === "gym_upper_body") return t("workoutsProgramUpperLowerSplit");
  if (program.id === "gym_beginner_strength") return t("workoutsProgramFullBodyStrength");
  return t(program.nameKey as TranslationKey);
}

function getProgramDifficultyLabel(
  difficulty: Program["difficulty"],
  t: (key: TranslationKey) => string
): string {
  if (difficulty === "beginner") return t("workoutsDifficultyBeginnerShort");
  if (difficulty === "advanced") return t("workoutsDifficultyAdvancedShort");
  return t("workoutsDifficultyIntermediateShort");
}

function getLastSessionLabel(
  dateIso: string | undefined,
  t: (key: TranslationKey) => string
): string | null {
  if (!dateIso) return null;
  const timestamp = new Date(dateIso).getTime();
  if (Number.isNaN(timestamp)) return null;
  const diffInDays = Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
  if (diffInDays === 0) return t("workoutsLastSessionToday");
  if (diffInDays === 1) return t("workoutsLastSessionYesterday");
  return formatTemplate(t("workoutsLastSessionDaysAgo"), { count: diffInDays });
}

export default function WorkoutsScreen() {
  const { t } = useLanguage();
  const { sessions, isLoaded, customPrograms, refreshCustomPrograms } = useWorkout();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<Tab>("gym");
  const [displayPrograms, setDisplayPrograms] = useState<Program[]>([]);
  const [isProgramsTransitioning, setIsProgramsTransitioning] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const latestSessionByProgram = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach((session) => {
      const existing = map.get(session.programId);
      if (!existing || new Date(session.date).getTime() > new Date(existing).getTime()) {
        map.set(session.programId, session.date);
      }
    });
    return map;
  }, [sessions]);

  const visiblePrograms = useMemo(() => {
    const byTab = activeTab === "cardio"
      ? PROGRAMS.filter((program) => !!program.isCardio)
      : PROGRAMS.filter((program) => !program.isCardio && program.type === activeTab);

    const order = new Map(PROGRAM_PRIORITIES[activeTab].map((id, index) => [id, index]));
    return [...byTab]
      .sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999))
      .slice(0, 3);
  }, [activeTab]);

  const sortedCustomPrograms = useMemo(() => {
    return [...customPrograms].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  }, [customPrograms]);

  useEffect(() => {
    setIsProgramsTransitioning(true);
    const timer = setTimeout(() => {
      setDisplayPrograms(visiblePrograms);
      setIsProgramsTransitioning(false);
    }, 160);

    return () => clearTimeout(timer);
  }, [visiblePrograms]);

  useEffect(() => {
    refreshCustomPrograms().catch((error) => {
      console.error("[Workouts] Failed to refresh custom programs", error);
    });
  }, [refreshCustomPrograms]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 1800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const webBottomPadding = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 6,
          paddingBottom: Platform.OS === "web" ? webBottomPadding + 170 : insets.bottom + 170,
        }}
      >
        <Animated.View entering={FadeInDown.duration(380)} style={styles.headerRow}>
          <Text
            style={[styles.title, { color: theme.text, fontFamily: Typography.titleStrong }]}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {t("workouts")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("workoutsSearchAction")}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setToastMessage(t("workoutsSearchSoonToast"));
            }}
            style={({ pressed }) => [
              styles.searchButton,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Ionicons name="search-outline" size={29} color={theme.textSecondary} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(380)} style={[styles.exercisesLinkRow, { paddingHorizontal: 20 }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/exercises" as any);
            }}
            style={({ pressed }) => [
              styles.exercisesLink,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Ionicons name="barbell-outline" size={16} color={theme.accent} />
            <Text style={[styles.exercisesLinkText, { color: theme.text, fontFamily: Typography.bodySemiBold }]}>
              Voir tous les exercices
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={styles.exercisesLinkChevron} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.tabsRow}>
          {TABS.map((tab) => (
            <Chip
              key={tab.key}
              label={t(tab.labelKey)}
              selected={activeTab === tab.key}
              selectedColor={theme.accent}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key);
              }}
              style={styles.tabChip}
              textStyle={styles.tabChipLabel}
            />
          ))}
        </Animated.View>

        <View style={styles.programsWrap}>
          {!isLoaded || isProgramsTransitioning
            ? Array.from({ length: 3 }).map((_, idx) => (
                <SkeletonCard key={`workout-skeleton-${idx}`} height={190} style={styles.programSkeleton} />
              ))
            : displayPrograms.length === 0 ? (
              <StateCard
                title={t("workoutsEmptyTitle")}
                description={t("workoutsEmptyDescription")}
                actionLabel={t("workoutsEmptyAction")}
                onActionPress={() => setActiveTab("gym")}
                style={styles.workoutStateCard}
              />
            ) : (
              displayPrograms.map((program, index) => {
            const accentColor = getProgramAccentColor(program, theme.accent);
            const lastSessionLabel = getLastSessionLabel(
              latestSessionByProgram.get(program.id),
              t
            );

            return (
              <Animated.View
                key={program.id}
                entering={FadeInDown.delay(120 + index * 70).duration(420)}
              >
                <Card
                  variant="hero"
                  borderLeftColor={accentColor}
                  borderLeftWidth={4}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    if (program.isCardio) {
                      router.push({ pathname: "/cardio/[id]", params: { id: program.id } });
                    } else {
                      router.push({ pathname: "/program/[id]", params: { id: program.id } });
                    }
                  }}
                  style={[styles.programCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={styles.programTop}>
                    <Text style={[styles.programTitle, { color: theme.text, fontFamily: Typography.titleStrong }]}>
                      {getProgramTitle(program, t)}
                    </Text>
                    <View style={[styles.levelBadge, { backgroundColor: `${accentColor}20` }]}>
                      <Text style={[styles.levelBadgeText, { color: accentColor, fontFamily: Typography.labelTech }]}>
                        {getProgramDifficultyLabel(program.difficulty, t)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.programMetaRow}>
                    <Ionicons name="calendar-outline" size={13} color={theme.textMuted} />
                    <Text
                      style={[styles.programMeta, { color: theme.textSecondary, fontFamily: Typography.body }]}
                      numberOfLines={1}
                    >
                      {program.totalWeeks} {t("weeks")} · {program.sessionsPerWeek}x{t("workoutsPerWeekSuffix")} ·{" "}
                      {program.type === "home" ? t("workoutsTabHome") : t("workoutsTabGym")}
                    </Text>
                  </View>

                  <View style={styles.programStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="time-outline" size={14} color={theme.textMuted} />
                      <Text style={[styles.statText, { color: theme.textMuted, fontFamily: Typography.bodyRegular }]}>
                        {program.durationMin} {t("minutes")}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Ionicons name="flame-outline" size={15} color={theme.accent} />
                      <Text style={[styles.statText, { color: theme.textMuted, fontFamily: Typography.bodyRegular }]}>
                        {program.caloriesPerSession} {t("kcal")}
                      </Text>
                    </View>
                    {lastSessionLabel ? (
                      <View style={styles.statItem}>
                        <Ionicons name="refresh-outline" size={14} color={theme.textMuted} />
                        <Text
                          style={[styles.lastSessionText, { color: theme.textMuted, fontFamily: Typography.bodyRegular }]}
                          numberOfLines={1}
                        >
                          {t("workoutsLastSessionPrefix")} {lastSessionLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Card>
              </Animated.View>
            );
          }))}
        </View>

        <Animated.View entering={FadeInDown.delay(360).duration(420)} style={styles.customProgramsSection}>
          <Text style={[styles.customProgramsTitle, { color: theme.textMuted, fontFamily: Typography.labelTech }]}>
            {t("workoutsCustomPrograms").toUpperCase()}
          </Text>

          <Card
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/builder");
            }}
            style={[styles.buildCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.buildCardContent}>
              <View style={[styles.buildIconWrap, { backgroundColor: `${theme.accent}2A` }]}>
                <Ionicons name="add" size={32} color={theme.accent} />
              </View>
              <Text style={[styles.buildCardText, { color: theme.textSecondary, fontFamily: Typography.bodySemiBold }]}>
                {t("workoutsBuildNewProgram")}
              </Text>
            </View>
          </Card>

          {sortedCustomPrograms.length > 0 ? (
            <View style={styles.customProgramList}>
              {sortedCustomPrograms.map((program) => {
                const exercisesCount = program.days.reduce((acc, day) => acc + day.exercises.length, 0);
                return (
                  <Card
                    key={program.id}
                    style={[
                      styles.customProgramCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        borderLeftColor: `${theme.accent}88`,
                      },
                    ]}
                  >
                    <Text style={[styles.customProgramTitle, { color: theme.text, fontFamily: Typography.title }]}>
                      {program.title}
                    </Text>
                    <Text
                      style={[
                        styles.customProgramMeta,
                        { color: theme.textSecondary, fontFamily: Typography.bodyRegular },
                      ]}
                    >
                      {`${program.days.length} ${t("days")} · ${exercisesCount} ${t("exercises")} · ${program.estimatedMinutes} ${t("minutes")}`}
                    </Text>
                  </Card>
                );
              })}
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("workoutsFabNewProgram")}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/builder");
        }}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.accent,
            opacity: pressed ? 0.84 : 1,
            bottom: Platform.OS === "web" ? 118 : insets.bottom + 78,
          },
        ]}
      >
        <Ionicons name="add" size={36} color="#fff" />
      </Pressable>

      <FeedbackToast
        message={toastMessage}
        tone="info"
        style={{
          bottom: Platform.OS === "web" ? 104 : insets.bottom + 64,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  headerRow: {
    paddingHorizontal: 20,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    flexShrink: 1,
    marginRight: 12,
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  searchButton: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: {
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  tabChip: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 23,
  },
  tabChipLabel: {
    fontSize: 16,
    fontFamily: Typography.bodySemiBold,
  },
  programsWrap: {
    paddingHorizontal: 20,
    gap: 14,
  },
  workoutStateCard: {
    borderRadius: 24,
    marginTop: 6,
  },
  programSkeleton: {
    borderRadius: 30,
  },
  programCard: {
    borderRadius: 30,
    padding: 22,
  },
  programTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  programTitle: {
    flex: 1,
    fontSize: 24,
    lineHeight: 26,
  },
  programMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  levelBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  levelBadgeText: {
    fontSize: 14,
    letterSpacing: 0.4,
  },
  programMeta: {
    flex: 1,
    fontSize: 13,
  },
  programStats: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    rowGap: 8,
    columnGap: 12,
    minWidth: 0,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
    flexShrink: 1,
  },
  statText: {
    fontSize: 14,
  },
  lastSessionText: {
    fontSize: 14,
    flexShrink: 1,
  },
  customProgramsSection: {
    marginTop: 28,
    marginHorizontal: 20,
    gap: 14,
  },
  customProgramsTitle: {
    fontSize: 11,
    letterSpacing: 1.8,
  },
  buildCard: {
    minHeight: 110,
    borderRadius: 28,
    paddingHorizontal: 20,
  },
  buildCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  buildIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  buildCardText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
  },
  customProgramList: {
    gap: 10,
  },
  customProgramCard: {
    borderRadius: 20,
    borderLeftWidth: 3,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  customProgramTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  customProgramMeta: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  exercisesLinkRow: {
    marginBottom: 16,
  },
  exercisesLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  exercisesLinkText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  exercisesLinkChevron: {
    marginLeft: "auto",
  },
  fab: {
    position: "absolute",
    right: 24,
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F55F2B",
    shadowOpacity: 0.42,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
