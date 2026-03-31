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
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { Goal, useWorkout, WorkoutSession } from "@/contexts/WorkoutContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Badge,
  Card,
  FeedbackToast,
  GoalCard,
  PrimaryButton,
  SectionLabel,
  SkeletonCard,
  StateCard,
  StatBlock,
} from "@/components/ui";
import { PROGRAMS } from "@/data/programs";
import { TranslationKey } from "@/lib/i18n";
import { getRecentPrTimeline, RecentPrRecord } from "@/utils/prStorage";
import { useAppTheme } from "@/hooks";
import { Typography } from "@/constants/typography";
import {
  AthleteIdentityCard,
  ProfileLevelJourneyCard,
  ProfileProgramSpotlight,
} from "@/features/profile";

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
  return String(value);
}

function getGoalProgress(goal: Goal): number {
  if (goal.target === goal.current) return 100;
  const raw =
    goal.target > goal.current
      ? (goal.current / goal.target) * 100
      : (goal.target / Math.max(goal.current, 1)) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function getRelativeLabel(dateIso: string, t: (key: TranslationKey) => string): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const check = new Date(date);
  check.setHours(0, 0, 0, 0);

  if (check.getTime() === today.getTime()) return t("today");
  if (check.getTime() === yesterday.getTime()) return t("yesterday");

  return date.toLocaleDateString();
}

function getProgramTitle(programId: string, t: (key: TranslationKey) => string): string {
  if (programId === "gym_push") return t("workoutsProgramPushPullLegs");
  if (programId === "gym_upper_body") return t("workoutsProgramUpperLowerSplit");
  if (programId === "gym_beginner_strength") return t("workoutsProgramFullBodyStrength");

  const program = PROGRAMS.find((item) => item.id === programId);
  if (!program) return t("workout");
  return t(program.nameKey as TranslationKey);
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

function StatTile({
  value,
  label,
  valueColor,
  textMuted,
}: {
  value: string;
  label: string;
  valueColor: string;
  textMuted: string;
}) {
  return (
    <StatBlock
      value={value}
      label={label}
      color={valueColor}
      variant="metric"
      style={styles.statCard}
      valueStyle={{ color: valueColor }}
      labelStyle={{ color: textMuted }}
    />
  );
}

function GoalTile({
  goal,
  title,
  subtitle,
  color,
}: {
  goal: Goal;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <Pressable
      onPress={() => router.push("/goals")}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
    >
      <GoalCard
        goal={{
          title,
          current: goal.current,
          target: goal.target,
          unit: goal.unit,
          progress: getGoalProgress(goal) / 100,
          statusLabel: subtitle,
        }}
        color={color}
        style={styles.goalCard}
      />
    </Pressable>
  );
}

function RecentSessionTile({
  session,
  doneLabel,
  t,
  colors,
}: {
  session: WorkoutSession;
  doneLabel: string;
  t: (key: TranslationKey) => string;
  colors: {
    card: string;
    accent: string;
    text: string;
    textSecondary: string;
  };
}) {
  return (
    <Card style={[styles.activityCard, { backgroundColor: colors.card, borderLeftColor: colors.accent, borderLeftWidth: 4 }]}>
      <View style={styles.activityMain}>
        <Text style={[styles.activityTitle, { color: colors.text, fontFamily: Typography.title }]} numberOfLines={1}>
          {getProgramTitle(session.programId, t)}
        </Text>
        <Text style={[styles.activityMeta, { color: colors.textSecondary, fontFamily: Typography.body }]}>
          {`${getRelativeLabel(session.date, t)} · ${session.durationMin} ${t("minutes")} · ${session.calories} ${t("kcal")}`}
        </Text>
      </View>

      {session.completed ? (
        <Badge label={doneLabel} variant="ember" style={styles.activityDoneBadge} />
      ) : null}
    </Card>
  );
}

export default function ProfileScreen() {
  const { t, language } = useLanguage();
  const { profile, goals, totalWorkouts, totalMinutes, totalCalories, streakDays, sessions, playerProgress, isLoaded } = useWorkout();
  const { user, isGuest, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, layout, typography } = useAppTheme();

  const displayName = user?.displayName || profile.name;
  const [recentRecords, setRecentRecords] = useState<RecentPrRecord[]>([]);
  const [isRecentRecordsLoading, setIsRecentRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error">("success");

  const loadRecentRecords = useCallback((showFeedback = false) => {
    let active = true;
    setIsRecentRecordsLoading(true);
    setRecordsError(false);

    getRecentPrTimeline(4)
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
        if (active) setIsRecentRecordsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [t]);

  useFocusEffect(useCallback(() => loadRecentRecords(false), [loadRecentRecords]));

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 1800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const memberSinceLabel = useMemo(() => {
    const source = user?.createdAt ? new Date(user.createdAt) : new Date();
    if (Number.isNaN(source.getTime())) return "";

    const localeByLanguage: Record<string, string> = {
      fr: "fr-FR",
      en: "en-US",
      es: "es-ES",
      de: "de-DE",
      ar: "ar-SA",
    };

    const locale = localeByLanguage[language] ?? "fr-FR";
    const monthYear = new Intl.DateTimeFormat(locale, {
      month: "short",
      year: "numeric",
    }).format(source);

    return formatTemplate(t("profileMemberSincePattern"), { date: monthYear });
  }, [language, t, user?.createdAt]);

  const modeLabel = useMemo(() => {
    const hasCardio = sessions.some((session) => session.type === "cardio");
    const hasStrength = sessions.some((session) => session.type !== "cardio");
    if (hasCardio && !hasStrength) return t("profileModeCardio");
    return t("profileModeGym");
  }, [sessions, t]);

  const objectiveLabel = useMemo(
    () => t(profile.objective as TranslationKey),
    [profile.objective, t]
  );

  const topGoals = goals.slice(0, 2);
  const recentSessions = sessions.slice(0, 3);

  const latestCompletedSession = useMemo(
    () => sessions.find((session) => session.completed) ?? null,
    [sessions]
  );

  const latestProgram = useMemo(() => {
    if (!latestCompletedSession) return null;
    return PROGRAMS.find((item) => item.id === latestCompletedSession.programId) ?? null;
  }, [latestCompletedSession]);

  const activeProgramTitle = latestCompletedSession
    ? getProgramTitle(latestCompletedSession.programId, t)
    : t("profileActiveProgramEmptyTitle");

  const activeProgramSubtitle = latestCompletedSession
    ? formatTemplate(t("profileActiveProgramSummaryPattern"), {
        date: getRelativeLabel(latestCompletedSession.date, t),
        minutes: latestCompletedSession.durationMin,
        kcal: latestCompletedSession.calories,
      })
    : t("profileActiveProgramEmptySubtitle");

  const activeProgramDetails = latestProgram
    ? formatTemplate(t("profileActiveProgramDetailsPattern"), {
        level: t(latestProgram.difficulty as TranslationKey),
        focus: t(latestProgram.category as TranslationKey),
      })
    : undefined;

  const levelProgressLabel = formatTemplate(t("profileJourneyProgressPattern"), {
    pct: Math.round(playerProgress.progressToNext * 100),
  });

  const levelSubtitle = playerProgress.nextLevelMinXp
    ? formatTemplate(t("xpProgressSubtitle"), {
        current: playerProgress.totalXp,
        next: playerProgress.nextLevelMinXp,
      })
    : t("xpMaxLevel");

  const openActiveProgram = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!latestCompletedSession || !latestProgram) {
      router.push("/workouts");
      return;
    }

    if (latestCompletedSession.type === "cardio") {
      router.push({ pathname: "/cardio/[id]", params: { id: latestProgram.id } });
      return;
    }

    router.push({ pathname: "/session/[id]", params: { id: latestProgram.id } });
  };

  const openWorkouts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/workouts");
  };

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const goalVisuals: Record<Goal["type"], { color: string }> = {
    goalWeight: { color: colors.accent },
    goalWorkoutsPerWeek: { color: "#2DD4A0" },
    goalCalories: { color: "#F5C842" },
    goalWaist: { color: "#5EA8FF" },
  };

  if (isGuest) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={{
            paddingTop: Platform.OS === "web" ? webTopPadding + 16 : insets.top + 16,
            paddingHorizontal: layout.screenPadding,
          }}
        >
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.family.titleStrong }]}>{t("profile")}</Text>
        </View>

        <View style={styles.guestWrap}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.guestTitle, { color: colors.text, fontFamily: typography.family.title }]}>
            {t("loginToAccess")}
          </Text>
          <Text style={[styles.guestSubtitle, { color: colors.textSecondary, fontFamily: typography.family.bodyRegular }]}>
            {t("guestModePrompt")}
          </Text>

          <PrimaryButton label={t("login")} onPress={() => logout()} style={styles.guestBtn} />
        </View>
      </View>
    );
  }

  if (!isLoaded) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 8,
            paddingBottom: Platform.OS === "web" ? 118 : insets.bottom + 96,
            paddingHorizontal: layout.screenPadding,
            gap: 12,
          }}
        >
          <SkeletonCard height={72} lines={2} />
          <SkeletonCard height={172} lines={4} style={styles.profileSkeletonCard} />
          <View style={styles.profileSkeletonStats}>
            <SkeletonCard height={118} lines={3} style={styles.profileSkeletonStat} />
            <SkeletonCard height={118} lines={3} style={styles.profileSkeletonStat} />
          </View>
          <View style={styles.profileSkeletonStats}>
            <SkeletonCard height={118} lines={3} style={styles.profileSkeletonStat} />
            <SkeletonCard height={118} lines={3} style={styles.profileSkeletonStat} />
          </View>
          <SkeletonCard height={168} lines={4} style={styles.profileSkeletonCard} />
          <SkeletonCard height={154} lines={4} style={styles.profileSkeletonCard} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 8,
          paddingBottom: Platform.OS === "web" ? 118 : insets.bottom + 96,
          paddingHorizontal: layout.screenPadding,
        }}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.family.titleStrong }]}>
            {t("profile")}
          </Text>
        </View>

        <AthleteIdentityCard
          title={t("profileAthleteIdentity")}
          name={displayName}
          meta={`${t(profile.level)} · ${memberSinceLabel}`}
          modeLabel={modeLabel}
          objectiveLabel={objectiveLabel}
          streakLabel={streakDays > 0 ? formatTemplate(t("profileStreakChipPattern"), { count: streakDays }) : undefined}
        />

        <View style={styles.statsGrid}>
          <StatTile
            value={formatCompactNumber(totalWorkouts)}
            label={t("totalSessions").toUpperCase()}
            valueColor={colors.accent}
            textMuted={colors.textMuted}
          />
          <StatTile
            value={formatCompactNumber(totalMinutes)}
            label={t("totalMinutes").toUpperCase()}
            valueColor={colors.text}
            textMuted={colors.textMuted}
          />
          <StatTile
            value={formatCompactNumber(totalCalories)}
            label={t("profileKcalBurnedLabel")}
            valueColor={colors.text}
            textMuted={colors.textMuted}
          />
          <StatTile
            value={String(streakDays)}
            label={t("profileDayStreakLabel")}
            valueColor="#F5C842"
            textMuted={colors.textMuted}
          />
        </View>

        <ProfileProgramSpotlight
          sectionTitle={t("profileActiveProgram")}
          title={activeProgramTitle}
          subtitle={activeProgramSubtitle}
          details={activeProgramDetails}
          primaryCtaLabel={latestCompletedSession ? t("continueWorkout") : t("browsePrograms")}
          secondaryCtaLabel={t("browsePrograms")}
          onPrimaryPress={openActiveProgram}
          onSecondaryPress={openWorkouts}
        />

        <ProfileLevelJourneyCard
          sectionTitle={t("profileJourney")}
          levelName={t(playerProgress.levelNameKey)}
          progress={playerProgress.progressToNext}
          progressLabel={levelProgressLabel}
          subtitle={levelSubtitle}
        />

        <SectionLabel
          style={styles.recordsSectionLabel}
          textStyle={styles.sectionLabel}
          action={t("progressOpenAction")}
          onAction={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("../(secondary)/progress");
          }}
        >
          {t("recentRecords")}
        </SectionLabel>

        <View style={styles.recordsList}>
          {isRecentRecordsLoading ? (
            <SkeletonCard height={120} lines={3} style={styles.recordsSkeletonCard} />
          ) : recordsError ? (
            <StateCard
              variant="error"
              title={t("stateErrorTitle")}
              description={t("stateErrorDescription")}
              actionLabel={t("retry")}
              onActionPress={() => loadRecentRecords(true)}
              style={styles.profileStateCard}
            />
          ) : recentRecords.length === 0 ? (
            <StateCard
              title={t("profileNoRecentRecordsTitle")}
              description={t("profileNoRecentRecordsSubtitle")}
              actionLabel={t("startWorkout")}
              onActionPress={openWorkouts}
              style={styles.profileStateCard}
            />
          ) : (
            recentRecords.map((record) => (
              <Card
                key={record.id}
                style={[styles.recordCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                borderLeftColor={colors.success}
              >
                <View style={styles.recordTop}>
                  <Text style={[styles.recordExercise, { color: colors.text, fontFamily: Typography.title }]} numberOfLines={1}>
                    {record.exerciseName}
                  </Text>
                  <Badge label={t("profileRecentRecordBadge")} variant="mint" />
                </View>
                <Text style={[styles.recordValue, { color: colors.success, fontFamily: Typography.bodyBold }]}>
                  {getRecordValueLabel(record, t)}
                </Text>
                <Text style={[styles.recordDate, { color: colors.textSecondary, fontFamily: Typography.body }]}>
                  {formatTemplate(t("profileRecentRecordDatePattern"), { date: getRelativeLabel(record.date, t) })}
                </Text>
              </Card>
            ))
          )}
        </View>

        <SectionLabel
          style={styles.sectionHeader}
          textStyle={styles.sectionLabel}
          action={t("profileAddShort")}
          onAction={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/goals");
          }}
        >
          {t("myGoals")}
        </SectionLabel>

        <View style={styles.goalsList}>
          {topGoals.length === 0 ? (
            <StateCard
              title={t("noGoals")}
              description={t("profileNoGoalsCardSubtitle")}
              actionLabel={t("addGoal")}
              onActionPress={() => router.push("/goals")}
              style={styles.profileStateCard}
            />
          ) : (
            topGoals.map((goal) => {
              const visual = goalVisuals[goal.type];
              const subtitle =
                goal.type === "goalWorkoutsPerWeek" || goal.type === "goalCalories"
                  ? formatTemplate(t("profileGoalThisWeekPattern"), {
                      current: goal.current,
                      target: goal.target,
                    })
                  : formatTemplate(t("profileGoalCurrentTargetPattern"), {
                      current: goal.current,
                      target: goal.target,
                      unit: goal.unit,
                    });

              return (
                <GoalTile
                  key={goal.id}
                  goal={goal}
                  title={t(goal.type)}
                  subtitle={subtitle}
                  color={visual.color}
                />
              );
            })
          )}
        </View>

        <SectionLabel style={styles.recentSectionLabel} textStyle={styles.sectionLabel}>
          {t("recentActivity")}
        </SectionLabel>

        <View style={styles.activityList}>
          {recentSessions.length === 0 ? (
            <StateCard
              title={t("noHistoryYet")}
              description={t("startYourJourney")}
              actionLabel={t("startWorkout")}
              onActionPress={openWorkouts}
              style={styles.profileStateCard}
            />
          ) : (
            recentSessions.map((session) => (
              <RecentSessionTile
                key={session.id}
                session={session}
                doneLabel={t("profileDoneBadge")}
                t={t}
                colors={colors}
              />
            ))
          )}
        </View>

        <SectionLabel style={styles.settingsSectionLabel} textStyle={styles.sectionLabel}>
          {t("profileSettingsFooterTitle")}
        </SectionLabel>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/settings");
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.86 : 1 }]}
        >
          <Card style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.settingsIconWrap, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}>
              <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.settingsMain}>
              <Text style={[styles.settingsTitle, { color: colors.text, fontFamily: Typography.bodySemiBold }]}>
                {t("settings")}
              </Text>
              <Text style={[styles.settingsSubtitle, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}>
                {t("profileSettingsFooterSubtitle")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        </Pressable>
      </ScrollView>

      <FeedbackToast
        message={toastMessage}
        tone={toastTone}
        style={{
          bottom: Platform.OS === "web" ? 24 : insets.bottom + 10,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -1,
  },
  profileSkeletonCard: {
    borderRadius: 20,
  },
  profileSkeletonStats: {
    flexDirection: "row",
    gap: 12,
  },
  profileSkeletonStat: {
    flex: 1,
    borderRadius: 18,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    minHeight: 118,
  },
  recordsSectionLabel: {
    marginTop: 18,
    marginBottom: 10,
  },
  recordsList: {
    gap: 10,
    marginBottom: 16,
  },
  recordsSkeletonCard: {
    borderRadius: 20,
  },
  profileStateCard: {
    borderRadius: 20,
  },
  recordCard: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  recordTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  recordExercise: {
    flex: 1,
    fontSize: 16,
  },
  recordValue: {
    fontSize: 14,
  },
  recordDate: {
    fontSize: 12,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
  },
  goalsList: {
    gap: 12,
    marginBottom: 12,
  },
  goalCard: {
    borderRadius: 20,
  },
  recentSectionLabel: { marginTop: 14 },
  activityList: {
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  activityCard: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activityMain: {
    flex: 1,
    gap: 4,
  },
  activityTitle: {
    fontSize: 17,
  },
  activityMeta: {
    fontSize: 13,
  },
  activityDoneBadge: {
    minHeight: 26,
    paddingHorizontal: 12,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 14,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 16,
  },
  emptySubtitle: {
    fontSize: 14,
  },
  settingsSectionLabel: {
    marginTop: 18,
    marginBottom: 10,
  },
  settingsCard: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsMain: {
    flex: 1,
    gap: 2,
  },
  settingsTitle: {
    fontSize: 14,
  },
  settingsSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  guestWrap: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  guestTitle: {
    fontSize: 22,
    textAlign: "center",
  },
  guestSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 21,
  },
  guestBtn: {
    marginTop: 10,
    width: "100%",
    maxWidth: 280,
  },
});
