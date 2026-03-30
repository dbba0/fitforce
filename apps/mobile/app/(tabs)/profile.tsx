import React, { useCallback, useMemo, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { Goal, useWorkout, WorkoutSession } from "@/contexts/WorkoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, Badge, Card, GoalCard, IconButton, PrimaryButton, SectionLabel, StatBlock } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { PROGRAMS } from "@/data/programs";
import { TranslationKey } from "@/lib/i18n";
import { getRecentPrTimeline, RecentPrRecord } from "@/utils/prStorage";

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
}: {
  value: string;
  label: string;
  valueColor: string;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <StatBlock
      value={value}
      label={label}
      color={valueColor}
      variant="metric"
      style={styles.statCard}
      valueStyle={{ color: valueColor }}
      labelStyle={{ color: theme.textMuted }}
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
}: {
  session: WorkoutSession;
  doneLabel: string;
  t: (key: TranslationKey) => string;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Card style={[styles.activityCard, { backgroundColor: theme.card, borderLeftColor: theme.accent, borderLeftWidth: 4 }]}> 
      <View style={styles.activityMain}>
        <Text style={[styles.activityTitle, { color: theme.text, fontFamily: "Syne_700Bold" }]} numberOfLines={1}>
          {getProgramTitle(session.programId, t)}
        </Text>
        <Text style={[styles.activityMeta, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>
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
  const { profile, goals, totalWorkouts, totalMinutes, totalCalories, streakDays, sessions } = useWorkout();
  const { user, isGuest, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const displayName = user?.displayName || profile.name;
  const [recentRecords, setRecentRecords] = useState<RecentPrRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getRecentPrTimeline(4)
        .then((records) => {
          if (active) setRecentRecords(records);
        })
        .catch(() => {
          if (active) setRecentRecords([]);
        });

      return () => {
        active = false;
      };
    }, [])
  );

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

  const topGoals = goals.slice(0, 2);
  const recentSessions = sessions.slice(0, 3);
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const goalVisuals: Record<Goal["type"], { color: string }> = {
    goalWeight: { color: theme.accent },
    goalWorkoutsPerWeek: { color: "#2DD4A0" },
    goalCalories: { color: "#F5C842" },
    goalWaist: { color: "#5EA8FF" },
  };

  if (isGuest) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}> 
        <View
          style={{
            paddingTop: Platform.OS === "web" ? webTopPadding + 16 : insets.top + 16,
            paddingHorizontal: 20,
          }}
        >
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Syne_800ExtraBold" }]}>{t("profile")}</Text>
        </View>

        <View style={styles.guestWrap}>
          <Ionicons name="lock-closed-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.guestTitle, { color: theme.text, fontFamily: "Syne_700Bold" }]}>{t("loginToAccess")}</Text>
          <Text style={[styles.guestSubtitle, { color: theme.textSecondary, fontFamily: "DMSans_400Regular" }]}>
            {t("guestModePrompt")}
          </Text>

          <PrimaryButton label={t("login")} onPress={() => logout()} style={styles.guestBtn} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}> 
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 8,
          paddingBottom: Platform.OS === "web" ? 118 : insets.bottom + 96,
          paddingHorizontal: 20,
        }}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: theme.text, fontFamily: "Syne_800ExtraBold" }]}>{t("profile")}</Text>

          <IconButton
            icon="settings-outline"
            size={58}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/settings");
            }}
            style={[styles.settingsBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          />
        </View>

        <View style={styles.identityRow}>
          <Avatar name={displayName} size={92} color={theme.accent} mode="tint" style={styles.avatar} />

          <View style={styles.identityMain}>
            <Text style={[styles.identityName, { color: theme.text, fontFamily: "Syne_800ExtraBold" }]}>{displayName}</Text>
            <Text style={[styles.identityMeta, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}> 
              {`${t(profile.level)} · ${memberSinceLabel}`}
            </Text>

            <View style={styles.badgesRow}>
              <Badge label={modeLabel} variant="ember" style={styles.modeBadge} />

              {streakDays > 0 ? (
                <Badge
                  label={formatTemplate(t("profileStreakChipPattern"), { count: streakDays })}
                  variant="gold"
                  style={styles.streakBadge}
                />
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatTile value={formatCompactNumber(totalWorkouts)} label={t("totalSessions").toUpperCase()} valueColor={theme.accent} />
          <StatTile value={formatCompactNumber(totalMinutes)} label={t("totalMinutes").toUpperCase()} valueColor={theme.text} />
          <StatTile value={formatCompactNumber(totalCalories)} label={t("profileKcalBurnedLabel")} valueColor={theme.text} />
          <StatTile value={String(streakDays)} label={t("profileDayStreakLabel")} valueColor="#F5C842" />
        </View>

        <SectionLabel style={styles.recordsSectionLabel} textStyle={styles.sectionLabel}>
          {t("recentRecords")}
        </SectionLabel>

        <View style={styles.recordsList}>
          {recentRecords.length === 0 ? (
            <Card style={[styles.emptyCard, { backgroundColor: theme.card }]}> 
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Syne_700Bold" }]}>
                {t("profileNoRecentRecordsTitle")}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>
                {t("profileNoRecentRecordsSubtitle")}
              </Text>
            </Card>
          ) : (
            recentRecords.map((record) => (
              <Card
                key={record.id}
                style={[styles.recordCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                borderLeftColor={theme.success}
              >
                <View style={styles.recordTop}>
                  <Text style={[styles.recordExercise, { color: theme.text, fontFamily: "Syne_700Bold" }]} numberOfLines={1}>
                    {record.exerciseName}
                  </Text>
                  <Badge label={t("profileRecentRecordBadge")} variant="mint" />
                </View>
                <Text style={[styles.recordValue, { color: theme.success, fontFamily: "DMSans_700Bold" }]}>
                  {getRecordValueLabel(record, t)}
                </Text>
                <Text style={[styles.recordDate, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>
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
            <Pressable
              onPress={() => router.push("/goals")}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <Card style={[styles.emptyCard, { backgroundColor: theme.card }]}> 
                <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Syne_700Bold" }]}>{t("noGoals")}</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>{t("profileNoGoalsCardSubtitle")}</Text>
              </Card>
            </Pressable>
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
            <Card style={[styles.emptyCard, { backgroundColor: theme.card }]}> 
              <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Syne_700Bold" }]}>{t("noHistoryYet")}</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>{t("startYourJourney")}</Text>
            </Card>
          ) : (
            recentSessions.map((session) => (
              <RecentSessionTile key={session.id} session={session} doneLabel={t("profileDoneBadge")} t={t} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: -1.2,
  },
  settingsBtn: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  avatar: {
    borderWidth: 2,
  },
  identityMain: {
    flex: 1,
  },
  identityName: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.9,
  },
  identityMeta: {
    fontSize: 14,
    marginTop: 3,
  },
  badgesRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  modeBadge: {
    minHeight: 34,
    paddingHorizontal: 14,
  },
  streakBadge: {
    minHeight: 34,
    paddingHorizontal: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  statCard: {
    width: "48%",
    minHeight: 118,
  },
  recordsSectionLabel: {
    marginBottom: 10,
  },
  recordsList: {
    gap: 10,
    marginBottom: 16,
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
