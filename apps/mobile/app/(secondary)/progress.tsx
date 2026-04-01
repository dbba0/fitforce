import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkout, WorkoutSession } from "@/contexts/WorkoutContext";
import { Badge, Card, FeedbackToast, PillTabs, SectionLabel, SkeletonCard, StateCard } from "@/components/ui";
import { useAppTheme } from "@/hooks";
import { PROGRAMS } from "@/data/programs";
import { TranslationKey } from "@/lib/i18n";
import { getRecentPrTimeline, RecentPrRecord } from "@/utils/prStorage";

type RangeTab = "week" | "month";

type GraphBar = {
  id: string;
  label: string;
  value: number;
};

function formatTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}

function formatCompactNumber(value: number): string {
  if (value >= 1000) {
    const compact = value / 1000;
    const formatted = compact >= 10 ? compact.toFixed(0) : compact.toFixed(1);
    return `${formatted}K`;
  }
  return String(Math.round(value));
}

function getLocale(language: string): string {
  const localeByLanguage: Record<string, string> = {
    fr: "fr-FR",
    en: "en-US",
    es: "es-ES",
    de: "de-DE",
    ar: "ar-SA",
  };
  return localeByLanguage[language] ?? "fr-FR";
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getSessionDate(session: WorkoutSession): Date {
  return startOfDay(new Date(session.date));
}

function getProgramTitle(programId: string, t: (key: TranslationKey) => string): string {
  if (programId === "gym_push") return t("workoutsProgramPushPullLegs");
  if (programId === "gym_upper_body") return t("workoutsProgramUpperLowerSplit");
  if (programId === "gym_beginner_strength") return t("workoutsProgramFullBodyStrength");
  const program = PROGRAMS.find((item) => item.id === programId);
  if (!program) return t("workout");
  return t(program.nameKey as TranslationKey);
}

function getRelativeLabel(dateIso: string, t: (key: TranslationKey) => string): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return "";
  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const check = startOfDay(date);
  if (check.getTime() === today.getTime()) return t("today");
  if (check.getTime() === yesterday.getTime()) return t("yesterday");
  return date.toLocaleDateString();
}

function getRecordValueLabel(record: RecentPrRecord, t: (key: TranslationKey) => string): string {
  if (record.weightKg > 0 && record.reps > 0) {
    return formatTemplate(t("profileRecentRecordValuePattern"), {
      weight: record.weightKg,
      reps: record.reps,
      score: record.score,
    });
  }
  return formatTemplate(t("profileRecentRecordScoreOnlyPattern"), {
    score: record.score,
  });
}

export default function ProgressScreen() {
  const { t, language } = useLanguage();
  const { sessions, weeklyChallenge, streakDays, playerProgress, isLoaded } = useWorkout();
  const { colors, spacing, layout, radius, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<RangeTab>("week");
  const [recentRecords, setRecentRecords] = useState<RecentPrRecord[]>([]);
  const [isRecordsLoading, setIsRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error">("success");

  const loadRecentRecords = useCallback((showFeedback = false) => {
    let active = true;
    setIsRecordsLoading(true);
    setRecordsError(false);

    getRecentPrTimeline(6)
      .then((records) => {
        if (!active) return;
        setRecentRecords(records);
        if (showFeedback) {
          setToastTone("success");
          setToastMessage(t("stateToastUpdated"));
        }
      })
      .catch(() => {
        if (!active) return;
        setRecentRecords([]);
        setRecordsError(true);
        if (showFeedback) {
          setToastTone("error");
          setToastMessage(t("stateToastRetryError"));
        }
      })
      .finally(() => {
        if (active) setIsRecordsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  useFocusEffect(
    useCallback(() => loadRecentRecords(false), [loadRecentRecords])
  );

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 1800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const completedSessions = useMemo(
    () => sessions.filter((session) => session.completed),
    [sessions]
  );

  const rangeDays = range === "week" ? 7 : 30;

  const periodStats = useMemo(() => {
    const end = startOfDay(new Date());
    end.setDate(end.getDate() + 1);

    const start = new Date(end);
    start.setDate(start.getDate() - rangeDays);

    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - rangeDays);

    const current = completedSessions.filter((session) => {
      const date = getSessionDate(session);
      return date >= start && date < end;
    });

    const previous = completedSessions.filter((session) => {
      const date = getSessionDate(session);
      return date >= previousStart && date < start;
    });

    const currentMinutes = current.reduce((sum, session) => sum + session.durationMin, 0);
    const currentKcal = current.reduce((sum, session) => sum + session.calories, 0);
    const previousMinutes = previous.reduce((sum, session) => sum + session.durationMin, 0);

    return {
      sessionCount: current.length,
      totalMinutes: currentMinutes,
      totalKcal: currentKcal,
      previousSessionCount: previous.length,
      previousMinutes,
      current,
    };
  }, [completedSessions, rangeDays]);

  const weekDayLabels = useMemo(() => {
    const locale = getLocale(language);
    const monday = startOfDay(new Date());
    const day = monday.getDay();
    const delta = day === 0 ? -6 : 1 - day;
    monday.setDate(monday.getDate() + delta);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      const short = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
      return short.slice(0, 1).toUpperCase();
    });
  }, [language]);

  const graphBars = useMemo<GraphBar[]>(() => {
    if (range === "week") {
      const today = startOfDay(new Date());
      const base = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - index));
        const iso = date.toISOString().split("T")[0];
        const value = completedSessions.filter((session) => {
          const dateIso = getSessionDate(session).toISOString().split("T")[0];
          return dateIso === iso;
        }).length;
        return {
          id: iso,
          label: weekDayLabels[index] ?? "",
          value,
        };
      });
      return base;
    }

    const today = startOfDay(new Date());
    return Array.from({ length: 4 }, (_, bucket) => {
      const start = new Date(today);
      start.setDate(today.getDate() - (27 - bucket * 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const value = completedSessions.filter((session) => {
        const date = getSessionDate(session);
        return date >= start && date < end;
      }).length;
      return {
        id: `w-${bucket}`,
        label: formatTemplate(t("progressGraphWeekLabel"), { index: bucket + 1 }),
        value,
      };
    });
  }, [completedSessions, range, t, weekDayLabels]);

  const maxGraphValue = useMemo(() => {
    const maxValue = graphBars.reduce((max, bar) => Math.max(max, bar.value), 0);
    return maxValue <= 0 ? 1 : maxValue;
  }, [graphBars]);

  const recentProgressText = useMemo(() => {
    const diff = periodStats.sessionCount - periodStats.previousSessionCount;
    if (periodStats.previousSessionCount <= 0 && periodStats.sessionCount <= 0) {
      return t("progressTrendStart");
    }
    if (diff > 0) {
      return formatTemplate(t("progressTrendUpPattern"), { count: diff });
    }
    if (diff === 0) {
      return t("progressTrendStable");
    }
    return t("progressTrendKeepMomentum");
  }, [periodStats.previousSessionCount, periodStats.sessionCount, t]);

  const metricTitle =
    range === "week" ? t("progressMainMetricWeek") : t("progressMainMetricMonth");

  const rangeTabs = useMemo(
    () => [
      { key: "week" as const, label: t("progressRangeWeek") },
      { key: "month" as const, label: t("progressRangeMonth") },
    ],
    [t]
  );

  const achievements = useMemo(() => {
    const items: { id: string; label: string; variant: "ember" | "mint" | "gold" | "sky" }[] = [];
    if (streakDays >= 7) {
      items.push({
        id: "streak",
        label: formatTemplate(t("progressAchievementStreakPattern"), { days: streakDays }),
        variant: "gold",
      });
    }
    if (weeklyChallenge.progress >= 1) {
      items.push({
        id: "challenge",
        label: t("progressAchievementWeeklyChallenge"),
        variant: "mint",
      });
    }
    if (playerProgress.level !== "rookie") {
      items.push({
        id: "level",
        label: formatTemplate(t("progressAchievementLevelPattern"), {
          level: t(playerProgress.levelNameKey),
        }),
        variant: "sky",
      });
    }
    if (recentRecords.length > 0) {
      items.push({
        id: "pr",
        label: t("progressAchievementPrActive"),
        variant: "ember",
      });
    }
    return items;
  }, [playerProgress.level, playerProgress.levelNameKey, recentRecords.length, streakDays, t, weeklyChallenge.progress]);

  const recentSessionRows = useMemo(
    () => completedSessions.slice(0, 8),
    [completedSessions]
  );
  const hasCompletedSessions = completedSessions.length > 0;

  const openWorkouts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/workouts");
  };

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 6,
          paddingBottom: Platform.OS === "web" ? 104 : insets.bottom + 84,
          paddingHorizontal: layout.screenPadding,
          gap: spacing[2],
        }}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={({ pressed }) => [
              styles.backBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: pressed ? 0.84 : 1,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.family.titleStrong }]}>
            {t("progressScreenTitle")}
          </Text>
        </View>

        <Card variant="hero" style={[styles.mainMetricCard, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
          <Text style={[styles.mainMetricLabel, { color: colors.textMuted, fontFamily: typography.family.labelTech }]}>
            {metricTitle}
          </Text>
          <Text style={[styles.mainMetricValue, { color: colors.text, fontFamily: typography.family.titleStrong }]}>
            {formatCompactNumber(periodStats.totalMinutes)}
          </Text>
          <Text style={[styles.mainMetricSuffix, { color: colors.accent, fontFamily: typography.family.labelTech }]}>
            {t("minutes")}
          </Text>
          <Text style={[styles.mainMetricMeta, { color: colors.textSecondary, fontFamily: typography.family.body }]}>
            {formatTemplate(t("progressMainMetricMeta"), {
              sessions: periodStats.sessionCount,
              kcal: formatCompactNumber(periodStats.totalKcal),
            })}
          </Text>
        </Card>

        <PillTabs tabs={rangeTabs} active={range} onChange={setRange} />

        {!isLoaded ? (
          <View style={styles.loadingStack}>
            <SkeletonCard height={170} lines={4} style={styles.loadingCard} />
            <SkeletonCard height={150} lines={4} style={styles.loadingCard} />
            <SkeletonCard height={220} lines={5} style={styles.loadingCard} />
          </View>
        ) : !hasCompletedSessions ? (
          <StateCard
            title={t("progressStateEmptyTitle")}
            description={t("progressStateEmptyDescription")}
            actionLabel={t("progressStateEmptyAction")}
            onActionPress={openWorkouts}
            style={styles.progressStateCard}
          />
        ) : (
          <>
            <Card style={[styles.graphCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SectionLabel style={styles.sectionSpacing} textStyle={styles.sectionLabel}>
                {t("progressGraphTitle")}
              </SectionLabel>
              <Text style={[styles.graphSubtitle, { color: colors.textSecondary, fontFamily: typography.family.body }]}>
                {range === "week" ? t("progressGraphSubtitleWeek") : t("progressGraphSubtitleMonth")}
              </Text>

              <View style={styles.graphBarsRow}>
                {graphBars.map((bar) => {
                  const ratio = Math.max(0.12, bar.value / maxGraphValue);
                  return (
                    <View key={bar.id} style={styles.graphColumn}>
                      <View style={[styles.graphTrack, { backgroundColor: colors.cardElevated, borderRadius: radius.sm }]}>
                        <View
                          style={[
                            styles.graphFill,
                            {
                              backgroundColor: colors.accent,
                              height: `${Math.round(ratio * 100)}%` as const,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.graphValue, { color: colors.text, fontFamily: typography.family.labelTech }]}>
                        {bar.value}
                      </Text>
                      <Text style={[styles.graphLabel, { color: colors.textMuted, fontFamily: typography.family.labelTech }]}>
                        {bar.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            {isRecordsLoading ? (
              <SkeletonCard height={148} lines={4} style={styles.loadingCard} />
            ) : recordsError ? (
              <StateCard
                variant="error"
                title={t("stateErrorTitle")}
                description={t("stateErrorDescription")}
                actionLabel={t("retry")}
                onActionPress={() => loadRecentRecords(true)}
                style={styles.progressStateCard}
              />
            ) : (
              <Card style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <SectionLabel style={styles.sectionSpacing} textStyle={styles.sectionLabel}>
                  {t("progressRecentSection")}
                </SectionLabel>
                <View style={styles.recentGrid}>
                  <View style={styles.recentColumn}>
                    <Text style={[styles.recentTitle, { color: colors.text, fontFamily: typography.family.bodySemiBold }]}>
                      {t("progressRecentPrTitle")}
                    </Text>
                    {recentRecords.length === 0 ? (
                      <Text style={[styles.recentHint, { color: colors.textSecondary, fontFamily: typography.family.bodyRegular }]}>
                        {t("progressRecentPrEmpty")}
                      </Text>
                    ) : (
                      recentRecords.slice(0, 2).map((record) => (
                        <View key={record.id} style={styles.recordItem}>
                          <Text style={[styles.recordExercise, { color: colors.text, fontFamily: typography.family.bodySemiBold }]} numberOfLines={1}>
                            {record.exerciseName}
                          </Text>
                          <Text style={[styles.recordValue, { color: colors.success, fontFamily: typography.family.body }]}>
                            {getRecordValueLabel(record, t)}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>

                  <View style={[styles.recentColumn, styles.recentTrendColumn]}>
                    <Text style={[styles.recentTitle, { color: colors.text, fontFamily: typography.family.bodySemiBold }]}>
                      {t("progressRecentTrendTitle")}
                    </Text>
                    <Text style={[styles.recentTrendValue, { color: colors.accent, fontFamily: typography.family.title }]}>
                      {periodStats.totalMinutes > periodStats.previousMinutes ? "+" : ""}
                      {formatCompactNumber(Math.max(0, periodStats.totalMinutes - periodStats.previousMinutes))}
                    </Text>
                    <Text style={[styles.recentHint, { color: colors.textSecondary, fontFamily: typography.family.bodyRegular }]}>
                      {recentProgressText}
                    </Text>
                  </View>
                </View>
              </Card>
            )}

            <Card style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SectionLabel style={styles.sectionSpacing} textStyle={styles.sectionLabel}>
                {t("progressHistoryTitle")}
              </SectionLabel>

              {recentSessionRows.length === 0 ? (
                <Text style={[styles.historyEmpty, { color: colors.textSecondary, fontFamily: typography.family.bodyRegular }]}>
                  {t("progressHistoryEmpty")}
                </Text>
              ) : (
                recentSessionRows.map((session, index) => (
                  <View
                    key={session.id}
                    style={[
                      styles.historyRow,
                      index < recentSessionRows.length - 1
                        ? { borderBottomColor: colors.border, borderBottomWidth: 1 }
                        : null,
                    ]}
                  >
                    <View style={styles.historyMain}>
                      <Text style={[styles.historyProgram, { color: colors.text, fontFamily: typography.family.bodySemiBold }]} numberOfLines={1}>
                        {getProgramTitle(session.programId, t)}
                      </Text>
                      <Text style={[styles.historyMeta, { color: colors.textMuted, fontFamily: typography.family.bodyRegular }]}>
                        {getRelativeLabel(session.date, t)}
                      </Text>
                    </View>

                    <View style={styles.historyStats}>
                      <Text style={[styles.historyValue, { color: colors.textSecondary, fontFamily: typography.family.bodyRegular }]}>
                        {formatTemplate(t("progressHistoryMinutesPattern"), { minutes: session.durationMin })}
                      </Text>
                      <Text style={[styles.historyValue, { color: colors.textMuted, fontFamily: typography.family.labelTech }]}>
                        {formatTemplate(t("progressHistoryKcalPattern"), { kcal: session.calories })}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </Card>
          </>
        )}

        {achievements.length > 0 ? (
          <Card style={[styles.achievementsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionLabel style={styles.sectionSpacing} textStyle={styles.sectionLabel}>
              {t("progressAchievementsTitle")}
            </SectionLabel>
            <View style={styles.achievementRow}>
              {achievements.map((item) => (
                <Badge key={item.id} label={item.label} variant={item.variant} style={styles.achievementBadge} />
              ))}
            </View>
          </Card>
        ) : null}
      </ScrollView>

      <FeedbackToast
        message={toastMessage}
        tone={toastTone}
        style={{
          bottom: Platform.OS === "web" ? 26 : insets.bottom + 10,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
  },
  mainMetricCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "flex-start",
    gap: 4,
  },
  mainMetricLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  mainMetricValue: {
    fontSize: 44,
    lineHeight: 46,
    letterSpacing: -1.4,
  },
  mainMetricSuffix: {
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginTop: -2,
  },
  mainMetricMeta: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 6,
  },
  loadingStack: {
    gap: 10,
  },
  loadingCard: {
    borderRadius: 20,
  },
  progressStateCard: {
    borderRadius: 20,
  },
  graphCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  sectionSpacing: {
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.1,
  },
  graphSubtitle: {
    fontSize: 13,
  },
  graphBarsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 8,
  },
  graphColumn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  graphTrack: {
    width: 18,
    height: 84,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  graphFill: {
    width: "100%",
    borderRadius: 999,
    minHeight: 10,
  },
  graphValue: {
    fontSize: 11,
  },
  graphLabel: {
    fontSize: 10,
  },
  recentCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  recentGrid: {
    flexDirection: "row",
    gap: 10,
  },
  recentColumn: {
    flex: 1,
    gap: 8,
  },
  recentTrendColumn: {
    alignItems: "flex-start",
  },
  recentTitle: {
    fontSize: 14,
  },
  recentHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  recentTrendValue: {
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.8,
  },
  recordItem: {
    gap: 2,
  },
  recordExercise: {
    fontSize: 13,
  },
  recordValue: {
    fontSize: 12,
  },
  historyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  historyEmpty: {
    fontSize: 13,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 9,
  },
  historyMain: {
    flex: 1,
    gap: 2,
  },
  historyProgram: {
    fontSize: 14,
  },
  historyMeta: {
    fontSize: 12,
  },
  historyStats: {
    alignItems: "flex-end",
    gap: 2,
  },
  historyValue: {
    fontSize: 12,
  },
  achievementsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  achievementRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  achievementBadge: {
    minHeight: 24,
    paddingHorizontal: 12,
  },
});
