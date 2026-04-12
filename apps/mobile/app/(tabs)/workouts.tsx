import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { FeedbackToast, SkeletonCard, StateCard } from "@/components/ui";
import { Typography } from "@/constants/typography";
import { PROGRAMS, Program } from "@/data/programs";

// ─── Figma design tokens ────────────────────────────────────────────────────
const ACCENT = "#FF6B35";
const BG = "#0A0A0F";
const CARD_BG = "#1A1A1A";
const CARD_BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#FFFFFF";
const MUTED = "rgba(255,255,255,0.5)";
const BADGE_BG = "rgba(255,107,53,0.2)";
const BADGE_BORDER = "rgba(255,107,53,0.4)";

type DifficultyFilter = "all" | "beginner" | "intermediate" | "advanced";

const FILTERS: { key: DifficultyFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "beginner", label: "Beginner" },
  { key: "intermediate", label: "Intermediate" },
  { key: "advanced", label: "Advanced" },
];

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  hiit: "High-intensity intervals for maximum fat burn",
  abs: "Core strengthening and definition",
  fullBody: "Complete full-body conditioning",
  push: "Build explosive upper body strength with compound movements",
  pull: "Back and biceps strength and width",
  legs: "Heavy compound leg work for maximum muscle and strength",
  upper: "Upper body power and strength training",
  lower: "Lower body strength and power",
  chest: "Chest development and pressing strength",
  back: "Build back thickness and width",
  strength: "Compound movements for raw strength",
  hypertrophy: "Muscle growth through progressive overload",
  cardio: "Cardiovascular endurance and conditioning",
};

function getProgramDescription(program: Program): string {
  return CATEGORY_DESCRIPTIONS[program.category] ?? "Build strength and endurance";
}

function getXpReward(calories: number): number {
  return Math.round((calories * 1.2) / 50) * 50;
}

function getProgramTitle(program: Program, t: (key: TranslationKey) => string): string {
  if (program.id === "gym_push") return t("workoutsProgramPushPullLegs");
  if (program.id === "gym_upper_body") return t("workoutsProgramUpperLowerSplit");
  if (program.id === "gym_beginner_strength") return t("workoutsProgramFullBodyStrength");
  return t(program.nameKey as TranslationKey);
}

function formatTemplate(template: string, values: Record<string, number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
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
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
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
    const nonCardio = PROGRAMS.filter((p) => !p.isCardio);
    if (difficultyFilter === "all") return nonCardio;
    return nonCardio.filter((p) => p.difficulty === difficultyFilter);
  }, [difficultyFilter]);

  const sortedCustomPrograms = useMemo(() => {
    return [...customPrograms].sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  }, [customPrograms]);

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
    <View style={[styles.root, { backgroundColor: BG }]}>
      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 6,
          paddingBottom: Platform.OS === "web" ? webBottomPadding + 170 : insets.bottom + 170,
        }}
      >
        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.duration(380)} style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Workouts</Text>
            <Text style={styles.subtitle}>{visiblePrograms.length} sessions available</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter workouts"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setToastMessage(t("workoutsSearchSoonToast"));
            }}
            style={({ pressed }) => [styles.filterButton, { opacity: pressed ? 0.82 : 1 }]}
          >
            <Ionicons name="filter-outline" size={22} color={MUTED} />
          </Pressable>
        </Animated.View>

        {/* ── Difficulty filter chips ── */}
        <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.filtersRow}>
          {FILTERS.map((f) => {
            const active = difficultyFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDifficultyFilter(f.key);
                }}
                style={[
                  styles.filterChip,
                  active ? styles.filterChipActive : styles.filterChipInactive,
                ]}
              >
                <Text style={[styles.filterChipLabel, { color: active ? TEXT : MUTED }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* ── Program cards ── */}
        <View style={styles.programsWrap}>
          {!isLoaded
            ? Array.from({ length: 3 }).map((_, idx) => (
                <SkeletonCard key={`workout-skeleton-${idx}`} height={280} style={styles.programSkeleton} />
              ))
            : visiblePrograms.length === 0 ? (
              <StateCard
                title={t("workoutsEmptyTitle")}
                description={t("workoutsEmptyDescription")}
                actionLabel="Show all"
                onActionPress={() => setDifficultyFilter("all")}
                style={styles.workoutStateCard}
              />
            ) : (
              visiblePrograms.map((program, index) => {
                const title = getProgramTitle(program, t);
                const description = getProgramDescription(program);
                const xp = getXpReward(program.caloriesPerSession);
                const lastSessionLabel = getLastSessionLabel(
                  latestSessionByProgram.get(program.id),
                  t
                );

                return (
                  <Animated.View
                    key={program.id}
                    entering={FadeInDown.delay(100 + index * 60).duration(420)}
                  >
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        if (program.isCardio) {
                          router.push({ pathname: "/cardio/[id]", params: { id: program.id } });
                        } else {
                          router.push({ pathname: "/program/[id]", params: { id: program.id } });
                        }
                      }}
                      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.94 : 1 }]}
                    >
                      {/* ── Image / gradient area ── */}
                      <View style={[styles.cardImageArea, { backgroundColor: program.gradient[0] }]}>
                        {/* Simulated gradient overlay: transparent top → dark bottom */}
                        <View style={styles.cardGradientTop} />
                        <View style={styles.cardGradientBottom} />

                        <View style={styles.cardImageContent}>
                          {/* Badge */}
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>
                              {program.difficulty.toUpperCase()}
                            </Text>
                          </View>

                          {/* Title + description */}
                          <Text style={styles.cardTitle} numberOfLines={2}>
                            {title}
                          </Text>
                          <Text style={styles.cardDesc} numberOfLines={2}>
                            {description}
                          </Text>

                          {/* Stats row */}
                          <View style={styles.statsRow}>
                            <Text style={styles.statChip}>⏱ {program.durationMin} min</Text>
                            <Text style={styles.statDot}>·</Text>
                            <Text style={styles.statChip}>🔥 {program.caloriesPerSession} cal</Text>
                            <Text style={styles.statDot}>·</Text>
                            <Text style={styles.statChip}>↗ +{xp} XP</Text>
                          </View>

                          {lastSessionLabel ? (
                            <Text style={styles.lastSession}>
                              {t("workoutsLastSessionPrefix")} {lastSessionLabel}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {/* ── Card bottom: exercise count + Start ── */}
                      <View style={styles.cardBottom}>
                        <View style={styles.exerciseCountRow}>
                          <Ionicons name="barbell-outline" size={16} color={MUTED} />
                          <Text style={styles.exerciseCountText}>
                            {program.workouts.length} exercises
                          </Text>
                        </View>
                        <View style={styles.startRow}>
                          <Text style={styles.startLabel}>Start</Text>
                          <Ionicons name="chevron-forward" size={16} color={ACCENT} />
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })
            )}
        </View>

        {/* ── Custom programs section ── */}
        <Animated.View entering={FadeInDown.delay(360).duration(420)} style={styles.customProgramsSection}>
          <Text style={styles.customProgramsTitle}>
            {t("workoutsCustomPrograms").toUpperCase()}
          </Text>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/builder");
            }}
            style={({ pressed }) => [styles.buildCard, { opacity: pressed ? 0.84 : 1 }]}
          >
            <View style={styles.buildCardContent}>
              <View style={styles.buildIconWrap}>
                <Ionicons name="add" size={32} color={ACCENT} />
              </View>
              <Text style={styles.buildCardText}>{t("workoutsBuildNewProgram")}</Text>
            </View>
          </Pressable>

          {sortedCustomPrograms.length > 0 ? (
            <View style={styles.customProgramList}>
              {sortedCustomPrograms.map((program) => {
                const exercisesCount = program.days.reduce((acc, day) => acc + day.exercises.length, 0);
                return (
                  <View
                    key={program.id}
                    style={styles.customProgramCard}
                  >
                    <Text style={styles.customProgramTitle}>{program.title}</Text>
                    <Text style={styles.customProgramMeta}>
                      {`${program.days.length} ${t("days")} · ${exercisesCount} ${t("exercises")} · ${program.estimatedMinutes} ${t("minutes")}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      {/* ── FAB ── */}
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

  // Header
  headerRow: {
    paddingHorizontal: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT,
    letterSpacing: -0.5,
    fontFamily: Typography.titleStrong,
  },
  subtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
    fontFamily: Typography.body,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  // Filters
  filtersRow: {
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
  },
  filterChipActive: {
    backgroundColor: ACCENT,
  },
  filterChipInactive: {
    backgroundColor: CARD_BG,
  },
  filterChipLabel: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: Typography.bodySemiBold,
  },

  // Programs list
  programsWrap: {
    paddingHorizontal: 20,
    gap: 16,
  },
  workoutStateCard: {
    borderRadius: 24,
    marginTop: 6,
  },
  programSkeleton: {
    borderRadius: 24,
  },

  // Card
  card: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: CARD_BG,
  },

  // Card image area (gradient header)
  cardImageArea: {
    height: 200,
    position: "relative",
    justifyContent: "flex-end",
  },
  cardGradientTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,15,0.15)",
  },
  cardGradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    backgroundColor: "rgba(10,10,15,0.72)",
  },
  cardImageContent: {
    padding: 16,
    paddingBottom: 14,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: BADGE_BG,
    borderWidth: 1,
    borderColor: BADGE_BORDER,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: ACCENT,
    letterSpacing: 0.8,
    fontFamily: Typography.labelTech,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT,
    marginBottom: 4,
    lineHeight: 24,
    fontFamily: Typography.titleStrong,
  },
  cardDesc: {
    fontSize: 13,
    color: MUTED,
    marginBottom: 10,
    lineHeight: 18,
    fontFamily: Typography.body,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  statChip: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontFamily: Typography.bodyRegular,
  },
  statDot: {
    fontSize: 12,
    color: MUTED,
  },
  lastSession: {
    fontSize: 11,
    color: MUTED,
    marginTop: 6,
    fontFamily: Typography.bodyRegular,
  },

  // Card bottom
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: CARD_BG,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  exerciseCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exerciseCountText: {
    fontSize: 14,
    color: MUTED,
    fontFamily: Typography.bodyRegular,
  },
  startRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  startLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: ACCENT,
    fontFamily: Typography.bodySemiBold,
  },

  // Custom programs
  customProgramsSection: {
    marginTop: 28,
    marginHorizontal: 20,
    gap: 14,
  },
  customProgramsTitle: {
    fontSize: 11,
    letterSpacing: 1.8,
    color: MUTED,
    fontFamily: Typography.labelTech,
  },
  buildCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: 28,
    minHeight: 110,
    paddingHorizontal: 20,
    justifyContent: "center",
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
    backgroundColor: "rgba(255,107,53,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  buildCardText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    color: "rgba(255,255,255,0.8)",
    fontFamily: Typography.bodySemiBold,
  },
  customProgramList: {
    gap: 10,
  },
  customProgramCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderLeftWidth: 3,
    borderLeftColor: `${ACCENT}88`,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  customProgramTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: TEXT,
    fontFamily: Typography.title,
  },
  customProgramMeta: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
    fontFamily: Typography.bodyRegular,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 24,
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#F55F2B",
    shadowOpacity: 0.42,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
