import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutUp,
  FadeInUp,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/hooks";
import ExerciseMedia from "@/components/ExerciseMedia";
import { GhostButton, PrimaryButton, SetDots } from "@/components/ui";
import { AppCard } from "@/ui";
import { TranslationKey } from "@/lib/i18n";
import { PROGRAMS } from "@/data/programs";
import { EXERCISES, MuscleGroup } from "@/data/exercises";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { checkAndStorePr } from "@/utils/prStorage";
import { getExerciseHistoryMap, saveExercisePerformance, ExerciseLastPerformance } from "@/utils/exerciseHistoryStorage";

type Phase = "active" | "rest" | "done";
type SessionPrHit = {
  exerciseId: string;
  exerciseName: string;
  score: number;
  previousBest: number;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STREAK_MILESTONES = [7, 30, 100] as const;
const STREAK_MILESTONES_KEY = "@fitforce_streak_milestones";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTemplate(
  template: string,
  values: Record<string, string | number>
): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}

function getMuscleLabelKey(muscle: MuscleGroup): TranslationKey {
  if (muscle === "back") return "backMuscle";
  return muscle as TranslationKey;
}

function getEquipmentLabelKey(equipment: string): TranslationKey {
  if (equipment === "kettlebell") return "dumbbell";
  return equipment as TranslationKey;
}

function getXpLevelNameKey(level: string): TranslationKey {
  if (level === "warrior") return "xpLevelWarrior";
  if (level === "legend") return "xpLevelLegend";
  if (level === "elite") return "xpLevelElite";
  return "xpLevelRookie";
}

function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + delta);
  return copy;
}

type WeekSnapshot = {
  sessions: number;
  durationMin: number;
  calories: number;
  activeDays: number;
  activityMap: boolean[];
};

function buildWeekSnapshot(
  sessions: { date: string; completed: boolean; durationMin?: number; calories?: number }[],
  weekStart: Date
): WeekSnapshot {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const activityMap = Array.from({ length: 7 }, () => false);
  let completed = 0;
  let durationMin = 0;
  let calories = 0;

  sessions.forEach((session) => {
    if (!session.completed) return;
    const date = new Date(session.date);
    if (Number.isNaN(date.getTime())) return;
    if (date < weekStart || date >= weekEnd) return;
    completed += 1;
    durationMin += Math.max(0, Number(session.durationMin ?? 0));
    calories += Math.max(0, Number(session.calories ?? 0));
    const dayIndex = Math.floor((date.getTime() - weekStart.getTime()) / 86400000);
    if (dayIndex >= 0 && dayIndex < 7) activityMap[dayIndex] = true;
  });

  return {
    sessions: completed,
    durationMin: Math.round(durationMin),
    calories: Math.round(calories),
    activeDays: activityMap.filter(Boolean).length,
    activityMap,
  };
}

function getWeekComparison(sessions: { date: string; completed: boolean; durationMin?: number; calories?: number }[]): {
  current: WeekSnapshot;
  previous: WeekSnapshot;
  deltaSessions: number;
} {
  const now = new Date();
  const currentStart = startOfWeekMonday(now);
  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - 7);
  const current = buildWeekSnapshot(sessions, currentStart);
  const previous = buildWeekSnapshot(sessions, previousStart);

  return {
    current,
    previous,
    deltaSessions: current.sessions - previous.sessions,
  };
}

function CircleTimer({
  seconds,
  total,
  color,
  subLabel,
}: {
  seconds: number;
  total: number;
  color: string;
  subLabel: string;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const size = 220;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(0, Math.min(1, seconds / total)) : 0;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={[styles.circleTimerWrap, { width: size, height: size }]}> 
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.border}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <Text style={[styles.circleTimerValue, { color: theme.text, fontFamily: Typography.titleStrong }]}> 
        {formatTime(seconds)}
      </Text>
      <Text style={[styles.circleTimerLabel, { color: theme.textSecondary, fontFamily: Typography.body }]}> 
        {subLabel}
      </Text>
    </View>
  );
}

type SessionBottomWorkout = {
  effectiveReps?: number | string;
  effectiveWeight?: number;
  restSeconds?: number;
};

function SessionBottomBar({
  theme,
  t,
  currentWorkout,
  nextExerciseName,
  nextExerciseMeta,
  bottomInset,
}: {
  theme: typeof Colors.dark | typeof Colors.light;
  t: (key: TranslationKey) => string;
  currentWorkout?: SessionBottomWorkout;
  nextExerciseName?: string;
  nextExerciseMeta?: string;
  bottomInset: number;
}) {
  const hasWeight = Number(currentWorkout?.effectiveWeight ?? 0) > 0;
  const weightValue = hasWeight ? String(Math.round(Number(currentWorkout?.effectiveWeight ?? 0))) : "-";
  const repsUnit = typeof currentWorkout?.effectiveReps === "number" ? t("reps") : "";

  return (
    <View
      style={[
        styles.sessionBottomBar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: Math.max(bottomInset, 8) + 6,
        },
      ]}
    >
      <View style={styles.sessionBottomMetricsRow}>
        <View style={[styles.sessionBottomMetricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sessionBottomMetricValue, { color: theme.text, fontFamily: Typography.titleStrong }]}>
            {String(currentWorkout?.effectiveReps ?? "-")}
          </Text>
          <Text style={[styles.sessionBottomMetricUnit, { color: theme.textSecondary, fontFamily: Typography.bodySemiBold }]}>
            {repsUnit}
          </Text>
          <Text style={[styles.sessionBottomMetricLabel, { color: theme.textMuted, fontFamily: Typography.labelTech }]}>
            {t("sessionTargetLabel")}
          </Text>
        </View>

        <View
          style={[
            styles.sessionBottomMetricCard,
            {
              backgroundColor: `${theme.accent}1A`,
              borderColor: `${theme.accent}66`,
            },
          ]}
        >
          <Text style={[styles.sessionBottomMetricValue, { color: theme.accent, fontFamily: Typography.titleStrong }]}>
            {weightValue}
          </Text>
          <Text style={[styles.sessionBottomMetricUnit, { color: theme.accent, fontFamily: Typography.title }]}>
            {hasWeight ? t("kg") : ""}
          </Text>
          <Text style={[styles.sessionBottomMetricLabel, { color: theme.textSecondary, fontFamily: Typography.labelTech }]}>
            {t("sessionWeightLabel")}
          </Text>
        </View>

        <View style={[styles.sessionBottomMetricCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sessionBottomMetricValue, { color: theme.text, fontFamily: Typography.titleStrong }]}>
            {String(currentWorkout?.restSeconds ?? 0)}
          </Text>
          <Text style={[styles.sessionBottomMetricUnit, { color: theme.textSecondary, fontFamily: Typography.bodySemiBold }]}>
            {t("seconds")}
          </Text>
          <Text style={[styles.sessionBottomMetricLabel, { color: theme.textMuted, fontFamily: Typography.labelTech }]}>
            {t("sessionRestLabel")}
          </Text>
        </View>
      </View>

      {nextExerciseName ? (
        <View style={styles.sessionBottomNextRow}>
          <Text style={[styles.sessionBottomNextLabel, { color: theme.textMuted, fontFamily: Typography.labelTech }]}>
            {t("nextExercise").toUpperCase()}
          </Text>
          <Text
            style={[styles.sessionBottomNextName, { color: theme.text, fontFamily: Typography.bodySemiBold }]}
            numberOfLines={1}
          >
            {nextExerciseName}
          </Text>
          {nextExerciseMeta ? (
            <Text style={[styles.sessionBottomNextMeta, { color: theme.textSecondary, fontFamily: Typography.body }]}>
              {nextExerciseMeta}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CountdownBadge({ value, color }: { value: number; color: string }) {
  const scale = useSharedValue(0.8);

  useEffect(() => {
    scale.value = 0.8;
    scale.value = withSequence(
      withTiming(1.08, { duration: 180 }),
      withTiming(1, { duration: 180 })
    );
  }, [scale, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: withTiming(1, { duration: 120 }),
  }));

  return (
    <Animated.View style={[styles.resumeCountdownBubble, { backgroundColor: `${color}20`, borderColor: `${color}55` }, animatedStyle]}>
      <Text style={[styles.resumeCountdownValue, { color, fontFamily: Typography.titleStrong }]}>{value}</Text>
    </Animated.View>
  );
}

function CountUpValue({
  target,
  duration = 900,
  format,
  style,
}: {
  target: number;
  duration?: number;
  format?: (value: number) => string;
  style: any;
}) {
  const progress = useSharedValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration });
  }, [duration, progress, target]);

  useAnimatedReaction(
    () => progress.value,
    (value) => {
      const next = Math.round(target * value);
      runOnJS(setDisplay)(next);
    },
    [target]
  );

  return <Text style={style}>{format ? format(display) : String(display)}</Text>;
}

function ConfettiPiece({
  left,
  color,
  delay,
}: {
  left: number;
  color: string;
  delay: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: 1600 }));
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const sway = Math.sin(progress.value * Math.PI * 2) * 20;
    const fadeOut = progress.value < 0.82 ? 1 : Math.max(0, 1 - (progress.value - 0.82) / 0.18);
    return {
      opacity: fadeOut,
      transform: [
        { translateY: progress.value * 280 },
        { translateX: sway },
        { rotate: `${progress.value * 720}deg` },
      ],
    };
  });

  return <Animated.View style={[styles.confettiPiece, { left, backgroundColor: color }, animatedStyle]} />;
}

function LightConfetti({ visible }: { visible: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, index) => ({
        id: `piece-${index}`,
        left: 16 + index * ((SCREEN_WIDTH - 48) / 14),
        delay: index * 55,
        color: ["#F55F2B", "#F5C842", "#2DD4A0", "#5EA8FF"][index % 4],
      })),
    []
  );

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.confettiLayer}>
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} left={piece.left} color={piece.color} delay={piece.delay} />
      ))}
    </View>
  );
}

function CompletionScreen({
  programId,
  totalMinutes,
  totalCalories,
  exercisesCount,
  completedSetCount,
  plannedSetCount,
  prHits,
  onClose,
}: {
  programId: string;
  totalMinutes: number;
  totalCalories: number;
  exercisesCount: number;
  completedSetCount?: number;
  plannedSetCount?: number;
  prHits: SessionPrHit[];
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { addSession, streakDays, sessions, grantXpBatch, playerProgress } = useWorkout();
  const { isAuthenticated } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const initialized = useRef(false);
  const completionDateRef = useRef(new Date().toISOString());
  const [openingFeed, setOpeningFeed] = useState(false);
  const [xpReward, setXpReward] = useState<{ gainedXp: number; leveledUp: boolean; newLevel: string } | null>(null);
  const [levelUpReached, setLevelUpReached] = useState<string | null>(null);
  const [milestoneReached, setMilestoneReached] = useState<number | null>(null);

  const program = PROGRAMS.find((item) => item.id === programId);
  const programName = program
    ? t(program.nameKey as TranslationKey)
    : programId;
  const nextProgram = useMemo(
    () =>
      PROGRAMS.find((item) => item.id !== programId && item.type === program?.type) ??
      PROGRAMS.find((item) => item.id !== programId) ??
      null,
    [program?.type, programId]
  );

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    addSession({
      programId,
      date: completionDateRef.current,
      durationMin: totalMinutes,
      calories: totalCalories,
      completed: true,
      type: "strength",
    });

    grantXpBatch({
      sessionCount: 1,
      prCount: prHits.length,
      streakCount: 1,
    })
      .then((reward) => {
        setXpReward({
          gainedXp: reward.gainedXp,
          leveledUp: reward.leveledUp,
          newLevel: reward.newLevel,
        });
        if (reward.leveledUp) {
          setLevelUpReached(reward.newLevel);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      })
      .catch(() => {});

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [addSession, grantXpBatch, programId, prHits.length, totalCalories, totalMinutes]);

  useEffect(() => {
    const milestone = STREAK_MILESTONES.find((value) => value === streakDays);
    if (!milestone) return;

    AsyncStorage.getItem(STREAK_MILESTONES_KEY)
      .then((raw) => {
        const parsed: number[] = raw ? JSON.parse(raw) : [];
        if (parsed.includes(milestone)) return;
        const next = [...parsed, milestone];
        setMilestoneReached(milestone);
        AsyncStorage.setItem(STREAK_MILESTONES_KEY, JSON.stringify(next)).catch(() => {});
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      })
      .catch(() => {});
  }, [streakDays]);

  const handleShare = async () => {
    if (openingFeed) return;
    if (!isAuthenticated) {
      Alert.alert(t("loginToAccess"), t("guestModePrompt"));
      return;
    }

    const baseContent = formatTemplate(t("feedAutoPostSessionPattern"), {
      program: programName,
      minutes: totalMinutes,
      kcal: totalCalories,
    });
    const prSuffix = prHits.length > 0
      ? formatTemplate(t("feedAutoPostPrSuffix"), { count: prHits.length })
      : "";
    const content = `${baseContent}${prSuffix}`;

    setOpeningFeed(true);
    try {
      router.push({
        pathname: "/feed",
        params: {
          autoPostToken: Date.now().toString(),
          autoPostType: "workout",
          autoPostProgramId: programId,
          autoPostDuration: String(totalMinutes),
          autoPostCalories: String(totalCalories),
          autoPostExercises: String(exercisesCount),
          autoPostPrCount: String(prHits.length),
          autoPostContent: content,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert(t("shareToFeedErrorTitle"), t("shareToFeedErrorMessage"));
    } finally {
      setOpeningFeed(false);
    }
  };

  const hasCurrentSessionInList = useMemo(
    () =>
      sessions.some((session) => {
        const delta = Math.abs(
          new Date(session.date).getTime() - new Date(completionDateRef.current).getTime()
        );
        return session.programId === programId && session.durationMin === totalMinutes && delta < 120000;
      }),
    [programId, sessions, totalMinutes]
  );

  const weekComparison = useMemo(() => {
    const source = hasCurrentSessionInList
      ? sessions
      : [
          ...sessions,
          {
            id: "local-completion",
            programId,
            date: completionDateRef.current,
            durationMin: totalMinutes,
            calories: totalCalories,
            completed: true,
          },
        ];
    return getWeekComparison(source);
  }, [hasCurrentSessionInList, programId, sessions, totalCalories, totalMinutes]);

  const setProgressPct =
    typeof completedSetCount === "number" && typeof plannedSetCount === "number" && plannedSetCount > 0
      ? Math.max(0, Math.min(100, Math.round((completedSetCount / plannedSetCount) * 100)))
      : null;

  const stats = [
    {
      key: "duration",
      value: totalMinutes,
      unit: t("minutes"),
      label: t("sessionDurationLabel"),
      color: theme.accent,
    },
    {
      key: "burned",
      value: totalCalories,
      unit: t("kcal"),
      label: t("sessionBurnedLabel"),
      color: theme.text,
    },
    {
      key: "completed",
      value: exercisesCount,
      unit: t("exercises"),
      label: t("sessionCompletedLabel"),
      color: theme.text,
    },
    {
      key: "streak",
      value: Math.max(1, streakDays),
      unit: t("days"),
      label: t("sessionStreakLabel"),
      color: "#F5C842",
    },
  ].filter((item) => !(item.key === "burned" && totalCalories <= 0));

  const handleNextSession = () => {
    if (!nextProgram) {
      router.push("/workouts");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace({ pathname: "/session/[id]", params: { id: nextProgram.id } });
  };

  return (
    <View style={[styles.completionScreen, { backgroundColor: theme.background }]}> 
      <View style={[styles.completionGlow, { backgroundColor: `${theme.accent}15` }]} />
      <LightConfetti visible />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.completionScrollContent}
      >
        <Animated.View entering={FadeInDown.duration(450)} style={styles.completionTop}> 
          <View style={[styles.completionCheckWrap, { backgroundColor: theme.accent }]}> 
            <Ionicons name="checkmark" size={52} color="#fff" />
          </View>

          <Text style={[styles.completionTitle, { color: theme.text, fontFamily: Typography.titleStrong }]}> 
            {t("sessionDoneTitle")}
          </Text>
          <Text style={[styles.completionSubtitle, { color: theme.textSecondary, fontFamily: Typography.body }]}> 
            {programName}
          </Text>
          <Text style={[styles.completionMessage, { color: theme.textSecondary, fontFamily: Typography.body }]}>
            {t("sessionCelebrationLine")}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(420)} style={styles.completionGrid}> 
          {stats.map((stat, index) => (
            <View
              key={`${stat.key}-${index}`}
              style={[styles.completionStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <CountUpValue
                target={stat.value}
                style={[styles.completionStatValue, { color: stat.color, fontFamily: Typography.titleStrong }]}
              />
              <Text style={[styles.completionStatUnit, { color: theme.textSecondary, fontFamily: Typography.body }]}> 
                {stat.unit}
              </Text>
              <Text style={[styles.completionStatLabel, { color: theme.textMuted, fontFamily: Typography.labelTech }]}> 
                {stat.label}
              </Text>
            </View>
          ))}
        </Animated.View>

        {setProgressPct !== null ? (
          <Animated.View
            entering={FadeInDown.delay(150).duration(380)}
            style={[styles.comparisonCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.comparisonTitle, { color: theme.text, fontFamily: Typography.title }]}>
              {t("sessionProgressSummaryTitle")}
            </Text>
            <Text style={[styles.comparisonBody, { color: theme.textSecondary, fontFamily: Typography.body }]}>
              {formatTemplate(t("sessionSeriesProgressPattern"), {
                completed: completedSetCount ?? 0,
                planned: plannedSetCount ?? 0,
              })}
            </Text>
            <View style={[styles.xpSummaryTrack, { backgroundColor: theme.cardElevated, marginTop: 2 }]}>
              <View
                style={[
                  styles.xpSummaryFill,
                  {
                    width: `${setProgressPct}%` as const,
                    backgroundColor: theme.accent,
                  },
                ]}
              />
            </View>
          </Animated.View>
        ) : null}

        {prHits.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(180).duration(360)} style={[styles.prListCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.prListTitle, { color: theme.text, fontFamily: Typography.title }]}>
              {t("sessionPrListTitle")}
            </Text>
            {prHits.map((hit) => (
              <View key={hit.exerciseId} style={styles.prListRow}>
                <Text style={[styles.prListExercise, { color: theme.text, fontFamily: Typography.bodySemiBold }]} numberOfLines={1}>
                  {hit.exerciseName}
                </Text>
                <Text style={[styles.prListValue, { color: theme.success, fontFamily: Typography.bodySemiBold }]}>
                  {formatTemplate(t("sessionPrListValue"), { score: hit.score })}
                </Text>
              </View>
            ))}
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(200).duration(380)} style={[styles.xpSummaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.xpSummaryTop}>
            <Text style={[styles.xpSummaryTitle, { color: theme.text, fontFamily: Typography.title }]}>
              {t("xpLabel")}
            </Text>
            <Text style={[styles.xpSummaryGain, { color: theme.accent, fontFamily: Typography.title }]}>
              +{xpReward?.gainedXp ?? 0}
            </Text>
          </View>
          <Text style={[styles.xpSummarySubtitle, { color: theme.textSecondary, fontFamily: Typography.body }]}>
            {t(playerProgress.levelNameKey)}
          </Text>
          <View style={[styles.xpSummaryTrack, { backgroundColor: theme.cardElevated }]}>
            <View
              style={[
                styles.xpSummaryFill,
                {
                  width: `${Math.round(playerProgress.progressToNext * 100)}%` as const,
                  backgroundColor: theme.accent,
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.comparisonDelta,
              {
                color: weekComparison.deltaSessions >= 0 ? theme.success : theme.textSecondary,
                fontFamily: Typography.bodySemiBold,
              },
            ]}
          >
            {weekComparison.deltaSessions >= 0
              ? formatTemplate(t("sessionWeekComparisonDeltaPositive"), { delta: weekComparison.deltaSessions })
              : t("sessionWeekComparisonDeltaKeep")}
          </Text>
        </Animated.View>

        {levelUpReached ? (
          <Animated.View entering={FadeInDown.delay(240).duration(360)} style={[styles.levelUpCard, { backgroundColor: `${theme.accent}18`, borderColor: `${theme.accent}55` }]}>
            <Ionicons name="sparkles-outline" size={18} color={theme.accent} />
            <Text style={[styles.levelUpText, { color: theme.accent, fontFamily: Typography.bodySemiBold }]}>
              {formatTemplate(t("xpLevelUpMessage"), { level: t(getXpLevelNameKey(levelUpReached)) })}
            </Text>
          </Animated.View>
        ) : null}

        {milestoneReached ? (
          <Animated.View entering={FadeInDown.delay(260).duration(360)} style={[styles.milestoneCard, { backgroundColor: `${theme.warning}20`, borderColor: `${theme.warning}55` }]}>
            <Ionicons name="flame" size={18} color={theme.warning} />
            <Text style={[styles.milestoneText, { color: theme.warning, fontFamily: Typography.bodySemiBold }]}>
              {formatTemplate(t("sessionStreakMilestoneReached"), { days: milestoneReached })}
            </Text>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInUp.delay(220).duration(420)} style={styles.completionActions}> 
          <PrimaryButton
            label={t("sessionBackHome")}
            onPress={onClose}
            style={styles.sharePrimaryBtn}
            textStyle={styles.sharePrimaryBtnText}
          />

          <PrimaryButton
            label={t("sessionNextWorkoutCta")}
            onPress={handleNextSession}
            style={[styles.backHomeBtn, { backgroundColor: theme.cardElevated }]}
            textStyle={[styles.backHomeBtnText, { color: theme.accent }]}
          />

          <GhostButton
            label={t("shareToFeed")}
            onPress={handleShare}
            style={styles.shareGhostBtn}
            textStyle={[styles.shareGhostText, { color: theme.textSecondary }]}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { radius } = useAppTheme();
  const { getCustomization, addSession } = useWorkout();

  const program = PROGRAMS.find((item) => item.id === id);

  const workoutsWithEx = useMemo(() => {
    return (program?.workouts ?? [])
      .map((workout) => {
        const exercise = EXERCISES.find((item) => item.id === workout.exerciseId);
        const custom = program ? getCustomization(program.id, workout.exerciseId) : {};
        return {
          ...workout,
          exercise,
          effectiveSets: custom.sets ?? workout.sets,
          effectiveReps: custom.reps !== undefined ? custom.reps : workout.reps,
          effectiveWeight: custom.weightKg ?? workout.weightKg,
        };
      })
      .filter((workout) => workout.exercise != null);
  }, [program, getCustomization]);

  const [exIndex, setExIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("active");
  const [elapsed, setElapsed] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  const [prToast, setPrToast] = useState<{ score: number } | null>(null);
  const [sessionPrHits, setSessionPrHits] = useState<SessionPrHit[]>([]);
  const [validationTick, setValidationTick] = useState(0);
  const [showSetValidationSuccess, setShowSetValidationSuccess] = useState(false);
  const [exerciseHistoryMap, setExerciseHistoryMap] = useState<Record<string, ExerciseLastPerformance>>({});

  const elapsedRef = useRef(0);
  const activeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionTriggeredRef = useRef(false);
  const doneSetScale = useSharedValue(1);
  const doneSetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: doneSetScale.value }],
  }));

  const currentWorkout = workoutsWithEx[exIndex];
  const currentExercise = currentWorkout?.exercise;
  const nextWorkout = workoutsWithEx[exIndex + 1];
  const nextExercise = nextWorkout?.exercise;
  const totalExercises = workoutsWithEx.length;

  const finalizeSession = useCallback(() => {
    if (!program || completionTriggeredRef.current) return;
    completionTriggeredRef.current = true;

    if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);

    const totalElapsedSeconds = Math.max(0, Math.round(elapsedRef.current));
    const totalMinutes = Math.max(1, Math.round(totalElapsedSeconds / 60));
    const totalCalories = Math.round(
      (program.caloriesPerSession * totalMinutes) / Math.max(1, program.durationMin)
    );
    const plannedSetCount = workoutsWithEx.reduce(
      (sum, workout) => sum + Math.max(0, workout.effectiveSets ?? 0),
      0
    );
    const completedBeforeCurrent = workoutsWithEx
      .slice(0, exIndex)
      .reduce((sum, workout) => sum + Math.max(0, workout.effectiveSets ?? 0), 0);
    const totalSeriesCompleted = Math.min(
      plannedSetCount,
      completedBeforeCurrent + Math.max(1, setIndex + 1)
    );
    const exercisesCompleted = Math.max(1, Math.min(totalExercises, exIndex + 1));
    const currentProgramName = t(program.nameKey as TranslationKey);
    const completionDate = new Date().toISOString();

    void (async () => {
      try {
        await addSession({
          programId: program.id,
          date: completionDate,
          durationMin: totalMinutes,
          calories: totalCalories,
          completed: true,
          type: "strength",
        });
      } catch (error) {
        console.error("[Session] Failed to save completed session before completion screen", error);
      }
    })();

    router.replace({
      pathname: "/session/completion",
      params: {
        duration: String(totalElapsedSeconds),
        exercisesCompleted: String(exercisesCompleted),
        totalSeries: String(totalSeriesCompleted),
        programName: currentProgramName,
        prCount: String(sessionPrHits.length),
      },
    } as never);
  }, [addSession, exIndex, program, setIndex, sessionPrHits.length, t, totalExercises, workoutsWithEx]);

  useEffect(() => {
    const keepAwakeTag = "fitforce-session";
    if (phase !== "done") {
      activateKeepAwakeAsync(keepAwakeTag).catch(() => {});
    } else {
      deactivateKeepAwake(keepAwakeTag);
    }
    return () => {
      deactivateKeepAwake(keepAwakeTag);
    };
  }, [phase]);

  useEffect(() => {
    if (!prToast) return;
    const timeout = setTimeout(() => setPrToast(null), 2400);
    return () => clearTimeout(timeout);
  }, [prToast]);

  useEffect(() => {
    if (!showSetValidationSuccess) return;
    const timeout = setTimeout(() => setShowSetValidationSuccess(false), 900);
    return () => clearTimeout(timeout);
  }, [showSetValidationSuccess, validationTick]);

  useEffect(() => {
    if (resumeCountdown === null) return;

    const timeout = setTimeout(() => {
      if (resumeCountdown <= 1) {
        setResumeCountdown(null);
        setIsPaused(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        return;
      }
      setResumeCountdown((prev) => (prev == null ? prev : prev - 1));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, 680);

    return () => clearTimeout(timeout);
  }, [resumeCountdown]);

  useEffect(() => {
    getExerciseHistoryMap()
      .then((map) => setExerciseHistoryMap(map))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (phase !== "active" || isPaused || resumeCountdown !== null) return;
    activeIntervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);

    return () => {
      if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
    };
  }, [phase, isPaused, resumeCountdown]);

  const advanceAfterRest = useCallback(() => {
    const nextSet = setIndex + 1;
    if (nextSet < (currentWorkout?.effectiveSets ?? 0)) {
      setSetIndex(nextSet);
      setPhase("active");
      return;
    }

    const nextExercise = exIndex + 1;
    if (nextExercise < workoutsWithEx.length) {
      setExIndex(nextExercise);
      setSetIndex(0);
      setPhase("active");
      return;
    }

    finalizeSession();
  }, [setIndex, currentWorkout?.effectiveSets, exIndex, workoutsWithEx.length, finalizeSession]);

  useEffect(() => {
    if (phase !== "rest" || restLeft <= 0 || isPaused || resumeCountdown !== null) return;

    restIntervalRef.current = setInterval(() => {
      setRestLeft((prev) => {
        if (prev <= 1) {
          if (restIntervalRef.current) clearInterval(restIntervalRef.current);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          advanceAfterRest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, [phase, restLeft, advanceAfterRest, isPaused, resumeCountdown]);

  const handleSetDone = () => {
    if (isPaused || resumeCountdown !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    doneSetScale.value = withSequence(
      withTiming(0.94, { duration: 90 }),
      withTiming(1.06, { duration: 120 }),
      withTiming(1, { duration: 140 })
    );
    setValidationTick((prev) => prev + 1);
    setShowSetValidationSuccess(true);
    const reps = typeof currentWorkout?.effectiveReps === "number" ? currentWorkout.effectiveReps : 0;
    const weight = Number(currentWorkout?.effectiveWeight ?? 0);
    const exerciseId = currentWorkout?.exerciseId;
    const exerciseTranslation =
      currentExercise?.translations?.[language as keyof typeof currentExercise.translations] ??
      currentExercise?.translations?.en;
    const exerciseName = exerciseTranslation?.name ?? t("workout");
    if (exerciseId && reps > 0 && weight > 0) {
      const score = Math.round(weight * reps);
      checkAndStorePr(exerciseId, score, {
        exerciseName,
        weightKg: weight,
        reps,
        date: new Date().toISOString(),
      })
        .then((result) => {
          if (result.isNewPr) {
            setPrToast({ score: result.bestScore });
            setSessionPrHits((prev) => {
              const existingIndex = prev.findIndex((item) => item.exerciseId === exerciseId);
              if (existingIndex === -1) {
                return [
                  ...prev,
                  {
                    exerciseId,
                    exerciseName,
                    score: result.bestScore,
                    previousBest: result.previousBest,
                  },
                ];
              }
              const next = [...prev];
              next[existingIndex] = {
                ...next[existingIndex],
                score: Math.max(next[existingIndex].score, result.bestScore),
              };
              return next;
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        })
        .catch(() => {});
    }

    if (exerciseId && reps > 0 && weight > 0) {
      saveExercisePerformance(exerciseId, {
        sets: setIndex + 1,
        reps,
        weightKg: weight,
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
    }

    if (activeIntervalRef.current) clearInterval(activeIntervalRef.current);
    const restSeconds = currentWorkout?.restSeconds ?? 60;
    setRestLeft(restSeconds);
    setPhase("rest");
  };

  const handleSkipRest = () => {
    if (isPaused || resumeCountdown !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    advanceAfterRest();
  };

  const handleAddThirtySeconds = () => {
    if (isPaused || resumeCountdown !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRestLeft((prev) => prev + 30);
  };

  const handlePauseSession = () => {
    if (phase === "done" || isPaused || resumeCountdown !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused(true);
  };

  const handleResumeSession = () => {
    if (!isPaused || resumeCountdown !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setResumeCountdown(3);
  };

  const handlePrevious = () => {
    if (setIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSetIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (exIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const prevExIndex = exIndex - 1;
      const prevSets = workoutsWithEx[prevExIndex]?.effectiveSets ?? 1;
      setExIndex(prevExIndex);
      setSetIndex(Math.max(0, prevSets - 1));
    }
  };

  const handleSkipExercise = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextExercise = exIndex + 1;
    if (nextExercise < workoutsWithEx.length) {
      setExIndex(nextExercise);
      setSetIndex(0);
      return;
    }
    finalizeSession();
  };

  const handleFinishEarly = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    finalizeSession();
  };

  const handleClose = () => {
    router.replace("/");
  };

  if (!program || workoutsWithEx.length === 0) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text style={[styles.fallbackText, { color: theme.text, fontFamily: Typography.bodySemiBold }]}> 
          {t("errorLoading")}
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.fallbackBtn, { backgroundColor: theme.accent }]}
        >
          <Text style={[styles.fallbackBtnText, { fontFamily: Typography.title }]}> 
            {t("back")}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (phase === "done") {
    const totalMinutes = Math.max(1, Math.round(elapsedRef.current / 60));
    const totalCalories = Math.round((program.caloriesPerSession * totalMinutes) / Math.max(1, program.durationMin));
    const plannedSetCount = workoutsWithEx.reduce((sum, workout) => sum + Math.max(0, workout.effectiveSets ?? 0), 0);
    const completedBeforeCurrent = workoutsWithEx
      .slice(0, exIndex)
      .reduce((sum, workout) => sum + Math.max(0, workout.effectiveSets ?? 0), 0);
    const completedSetCount = Math.min(plannedSetCount, completedBeforeCurrent + Math.max(1, setIndex + 1));
    return (
      <CompletionScreen
        programId={program.id}
        totalMinutes={totalMinutes}
        totalCalories={totalCalories}
        exercisesCount={workoutsWithEx.length}
        completedSetCount={completedSetCount}
        plannedSetCount={plannedSetCount}
        prHits={sessionPrHits}
        onClose={handleClose}
      />
    );
  }

  const exerciseTranslation =
    currentExercise?.translations?.[language as keyof typeof currentExercise.translations] ??
    currentExercise?.translations?.en;
  const nextExerciseTranslation =
    nextExercise?.translations?.[language as keyof typeof nextExercise.translations] ??
    nextExercise?.translations?.en;

  const exerciseProgress = Math.max(
    0,
    Math.min(1, totalExercises > 0 ? (exIndex + 1) / totalExercises : 0)
  );

  const setProgress = currentWorkout?.effectiveSets ?? 1;
  const displayedSet = setIndex + 1;
  const setProgressPct = Math.round((displayedSet / Math.max(1, setProgress)) * 100);
  const primaryMuscle = currentExercise?.muscles?.[0];
  const muscleLabel = primaryMuscle ? t(getMuscleLabelKey(primaryMuscle)) : t("fullBody");
  const equipmentLabel = currentExercise
    ? t(getEquipmentLabelKey(currentExercise.equipment))
    : t("equipment");
  const lastPerformance = currentWorkout?.exerciseId ? exerciseHistoryMap[currentWorkout.exerciseId] : undefined;
  const currentVolume =
    typeof currentWorkout?.effectiveReps === "number"
      ? Math.round((currentWorkout?.effectiveSets ?? 0) * currentWorkout.effectiveReps * (currentWorkout?.effectiveWeight ?? 0))
      : 0;
  const lastVolume = lastPerformance
    ? Math.round(lastPerformance.sets * lastPerformance.reps * lastPerformance.weightKg)
    : 0;
  const isVsLastImproved = currentVolume > 0 && lastVolume > 0 && currentVolume > lastVolume;

  const doneSetLabel = formatTemplate(t("sessionDoneSetCta"), { set: displayedSet });
  const progressLabel = formatTemplate(t("sessionExercisesProgress"), {
    current: exIndex + 1,
    total: totalExercises,
  });

  const restDetail = (currentWorkout?.effectiveWeight ?? 0) > 0
    ? formatTemplate(t("sessionRestDetailWeighted"), {
        weight: Math.round(currentWorkout?.effectiveWeight ?? 0),
        reps: String(currentWorkout?.effectiveReps ?? ""),
      })
    : formatTemplate(t("sessionRestDetailBodyweight"), {
        reps: String(currentWorkout?.effectiveReps ?? ""),
      });
  const nextExerciseMeta = nextExerciseTranslation?.name
    ? `${nextWorkout?.effectiveSets ?? 0} × ${nextWorkout?.effectiveReps ?? "-"}`
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}> 
        <View style={[styles.headerProgressTrack, { backgroundColor: theme.border }]}> 
          <View
            style={[
              styles.headerProgressFill,
              {
                width: `${Math.round(exerciseProgress * 100)}%` as const,
                backgroundColor: theme.accent,
              },
            ]}
          />
        </View>

        <View style={styles.headerRow}> 
          <Pressable
            onPress={handleFinishEarly}
            style={({ pressed }) => [
              styles.headerIconBtn,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>

          <Text style={[styles.headerProgressText, { color: theme.textMuted, fontFamily: Typography.labelTech }]}> 
            {progressLabel}
          </Text>

          <Pressable
            onPress={isPaused ? handleResumeSession : handlePauseSession}
            style={({ pressed }) => [
              styles.headerIconBtn,
              {
                backgroundColor: theme.card,
                borderColor: isPaused ? `${theme.accent}66` : theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons
              name={isPaused ? "play" : "pause"}
              size={18}
              color={isPaused ? theme.accent : theme.textSecondary}
            />
            <Text style={[styles.headerElapsedText, { color: theme.textMuted, fontFamily: Typography.bodySemiBold }]}> 
              {formatTime(elapsed)}
            </Text>
          </Pressable>
        </View>
      </View>

      {phase === "active" ? (
        <Animated.View entering={FadeIn.duration(280)} style={styles.activeScreen}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            contentContainerStyle={{ paddingBottom: 120 }}
          >
            <View style={styles.activeContent}>
              <Text style={[styles.exerciseTitle, { color: theme.text, fontFamily: Typography.titleStrong }]}>
                {exerciseTranslation?.name}
              </Text>

              <AppCard
                variant="elevated"
                style={[
                  styles.immersiveTimerCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    borderRadius: radius.lg,
                  },
                ]}
              >
                <View style={styles.immersiveTimerTopRow}>
                  <Text style={[styles.immersiveTimerLabel, { color: theme.textMuted, fontFamily: Typography.labelTech }]}>
                    {t("sessionDurationLabel").toUpperCase()}
                  </Text>
                  <Text style={[styles.immersiveTimerProgress, { color: theme.textSecondary, fontFamily: Typography.bodySemiBold }]}>
                    {progressLabel}
                  </Text>
                </View>

                <Text style={[styles.immersiveTimerValue, { color: theme.text, fontFamily: Typography.titleStrong }]}>
                  {formatTime(elapsed)}
                </Text>

                <View style={styles.setLine}>
                  <Text style={[styles.setLineLabel, { color: theme.textSecondary, fontFamily: Typography.labelTech }]}>
                    {t("set").toUpperCase()}
                  </Text>
                  <SetDots total={setProgress} current={setIndex} done={setIndex - 1} style={styles.setDotsRow} />
                  <Text style={[styles.setLineCount, { color: theme.textMuted, fontFamily: Typography.labelTech }]}>
                    {displayedSet} / {setProgress}
                  </Text>
                </View>
                <View style={[styles.setProgressTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.setProgressFill,
                      {
                        width: `${setProgressPct}%` as const,
                        backgroundColor: theme.accent,
                      },
                    ]}
                  />
                </View>
              </AppCard>

              {lastPerformance ? (
                <Text
                  style={[
                    styles.vsLastText,
                    {
                      color: isVsLastImproved ? theme.success : theme.textSecondary,
                      fontFamily: Typography.body,
                    },
                  ]}
                >
                  {formatTemplate(t("sessionVsLastTimePattern"), {
                    sets: lastPerformance.sets,
                    reps: lastPerformance.reps,
                    weight: Math.round(lastPerformance.weightKg),
                  })}
                </Text>
              ) : null}

              {prToast ? (
                <Animated.View
                  entering={FadeInDown.duration(220)}
                  style={[
                    styles.prToast,
                    {
                      backgroundColor: `${theme.accent}18`,
                      borderColor: `${theme.accent}55`,
                    },
                  ]}
                >
                  <Ionicons name="trophy-outline" size={18} color={theme.accent} />
                  <View style={styles.prTextWrap}>
                    <Text style={[styles.prTitle, { color: theme.accent, fontFamily: Typography.labelTech }]}>
                      {t("sessionNewPrBadge")}
                    </Text>
                    <Text style={[styles.prValue, { color: theme.text, fontFamily: Typography.bodySemiBold }]}>
                      {formatTemplate(t("sessionNewPrValue"), { score: prToast.score })}
                    </Text>
                  </View>
                </Animated.View>
              ) : null}

              <Animated.View style={doneSetAnimatedStyle}>
                <Pressable
                  onPress={handleSetDone}
                  disabled={isPaused || resumeCountdown !== null}
                  style={({ pressed }) => [
                    styles.doneSetBtn,
                    {
                      backgroundColor: theme.accent,
                      opacity: isPaused || resumeCountdown !== null ? 0.45 : pressed ? 0.86 : 1,
                    },
                  ]}
                >
                  <Ionicons name="checkmark" size={22} color="#fff" />
                  <Text style={[styles.doneSetBtnText, { fontFamily: Typography.titleStrong }]}>
                    {doneSetLabel}
                  </Text>
                </Pressable>
              </Animated.View>

              <View style={styles.setSuccessSlot}>
                {showSetValidationSuccess ? (
                  <Animated.View
                    key={`set-success-${validationTick}`}
                    entering={FadeInUp.duration(180)}
                    exiting={FadeOutUp.duration(220)}
                    style={[styles.setSuccessChip, { backgroundColor: `${theme.success}22`, borderColor: `${theme.success}66` }]}
                  >
                    <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                    <Text style={[styles.setSuccessText, { color: theme.success, fontFamily: Typography.bodySemiBold }]}>
                      {t("setComplete")}
                    </Text>
                  </Animated.View>
                ) : null}
              </View>

              <View style={styles.bottomActionsRow}>
                <Pressable
                  onPress={handlePrevious}
                  disabled={setIndex === 0 && exIndex === 0 || isPaused || resumeCountdown !== null}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    {
                      opacity: setIndex === 0 && exIndex === 0 || isPaused || resumeCountdown !== null ? 0.3 : pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.secondaryActionText, { color: theme.textMuted, fontFamily: Typography.bodySemiBold }]}>
                    {t("sessionPreviousAction")}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSkipExercise}
                  disabled={isPaused || resumeCountdown !== null}
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    { opacity: isPaused || resumeCountdown !== null ? 0.3 : pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.secondaryActionText, { color: theme.textMuted, fontFamily: Typography.bodySemiBold }]}>
                    {t("sessionSkipAction")}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.foldSpacer} />

              <AppCard
                variant="default"
                style={[
                  styles.exerciseDetailsCard,
                  {
                    backgroundColor: theme.cardElevated,
                    borderColor: theme.border,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Text style={[styles.exerciseMeta, { color: theme.accent, fontFamily: Typography.labelTech }]}>
                  {`${muscleLabel} · ${equipmentLabel}`.toUpperCase()}
                </Text>
                {exerciseTranslation?.description ? (
                  <Text style={[styles.exerciseDetailsText, { color: theme.textSecondary, fontFamily: Typography.body }]}>
                    {exerciseTranslation.description}
                  </Text>
                ) : null}
                <ExerciseMedia
                  exerciseId={currentExercise?.id}
                  type="auto"
                  size={190}
                  autoPlay={phase === "active"}
                  loop
                  isActive={phase === "active"}
                  muscles={currentExercise?.muscles ?? []}
                  title={exerciseTranslation?.name ?? t("sessionIllustrationPlaceholder")}
                  subtitle={exerciseTranslation?.description ?? t("sessionIllustrationPlaceholder")}
                  theme={theme}
                  highlightColor={theme.accent}
                />
              </AppCard>
            </View>
          </ScrollView>

          <SessionBottomBar
            theme={theme}
            t={t}
            currentWorkout={currentWorkout}
            nextExerciseName={nextExerciseTranslation?.name}
            nextExerciseMeta={nextExerciseMeta}
            bottomInset={insets.bottom}
          />
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(280)} style={styles.restContent}> 
          <Text style={[styles.restCaption, { color: theme.textMuted, fontFamily: Typography.labelTech }]}> 
            {t("resting").toUpperCase()}
          </Text>

          <CircleTimer
            seconds={restLeft}
            total={currentWorkout?.restSeconds ?? 60}
            color={theme.accent}
            subLabel={t("sessionRemainingLabel")}
          />

          <Text style={[styles.restHeadline, { color: theme.text, fontFamily: Typography.titleStrong }]}> 
            {formatTemplate(t("sessionSetCompleteMessage"), { set: displayedSet })}
          </Text>
          <Text style={[styles.restDetail, { color: theme.textSecondary, fontFamily: Typography.body }]}> 
            {restDetail}
          </Text>

          <View style={styles.restButtonsRow}> 
            <GhostButton
              label={t("sessionAddThirtySeconds")}
              onPress={handleAddThirtySeconds}
              style={styles.addTimeBtn}
              textStyle={styles.addTimeBtnText}
            />

            <PrimaryButton
              label={t("skipRest")}
              onPress={handleSkipRest}
              style={styles.skipRestBtn}
              textStyle={styles.skipRestBtnText}
            />
          </View>
        </Animated.View>
      )}

      {isPaused ? (
        <Animated.View entering={FadeIn.duration(160)} style={[styles.pauseOverlay, { backgroundColor: theme.overlay }]}>
          {resumeCountdown !== null ? (
            <View style={[styles.pauseCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.pauseTitle, { color: theme.text, fontFamily: Typography.titleStrong }]}>
                {t("resume")}
              </Text>
              <CountdownBadge value={resumeCountdown} color={theme.accent} />
            </View>
          ) : (
            <View style={[styles.pauseCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.pauseHeader}>
                <Ionicons name="pause" size={18} color={theme.accent} />
                <Text style={[styles.pauseTitle, { color: theme.text, fontFamily: Typography.titleStrong }]}>
                  {t("pause")}
                </Text>
              </View>
              <Text style={[styles.pauseSubtitle, { color: theme.textSecondary, fontFamily: Typography.body }]}>
                {t("sessionPausedHint")}
              </Text>
              <View style={styles.pauseActions}>
                <PrimaryButton
                  label={t("resume")}
                  onPress={handleResumeSession}
                  style={styles.pauseResumeBtn}
                />
                <GhostButton
                  label={t("finish")}
                  onPress={handleFinishEarly}
                  style={styles.pauseFinishBtn}
                />
              </View>
            </View>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 12,
  },
  headerProgressTrack: {
    height: 4,
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  headerProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  headerElapsedText: {
    fontSize: 9,
  },
  headerProgressText: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  activeContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 12,
  },
  activeScreen: {
    flex: 1,
  },
  exerciseMeta: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  exerciseTitle: {
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -1,
  },
  immersiveTimerCard: {
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  immersiveTimerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  immersiveTimerLabel: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  immersiveTimerProgress: {
    fontSize: 12,
  },
  immersiveTimerValue: {
    fontSize: 58,
    lineHeight: 60,
    letterSpacing: -1.2,
  },
  vsLastText: {
    fontSize: 13,
    marginTop: -2,
  },
  setLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  setLineLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
  },
  setDotsRow: {
    flex: 1,
    justifyContent: "center",
  },
  setLineCount: {
    fontSize: 11,
    letterSpacing: 1.1,
  },
  setProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  setProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  prToast: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  prTextWrap: { flex: 1, gap: 2 },
  prTitle: {
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  prValue: {
    fontSize: 14,
  },
  nextExerciseCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  nextExerciseLabel: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  nextExerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  nextExerciseName: {
    flex: 1,
    fontSize: 16,
  },
  nextExerciseMeta: {
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  metricValue: {
    fontSize: 42,
    lineHeight: 44,
  },
  metricUnit: {
    fontSize: 16,
  },
  metricLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  doneSetBtn: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 82,
    borderRadius: 40,
    shadowColor: "#F55F2B",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  doneSetBtnText: {
    color: "#fff",
    fontSize: 20,
  },
  setSuccessSlot: {
    minHeight: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  setSuccessChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  setSuccessText: {
    fontSize: 13,
  },
  bottomActionsRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  secondaryAction: {
    paddingVertical: 8,
  },
  secondaryActionText: {
    fontSize: 16,
  },
  foldSpacer: {
    height: 72,
  },
  exerciseDetailsCard: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  exerciseDetailsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sessionBottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  sessionBottomMetricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  sessionBottomMetricCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 86,
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  sessionBottomMetricValue: {
    fontSize: 30,
    lineHeight: 32,
  },
  sessionBottomMetricUnit: {
    fontSize: 12,
    lineHeight: 14,
  },
  sessionBottomMetricLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sessionBottomNextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    minHeight: 20,
  },
  sessionBottomNextLabel: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  sessionBottomNextName: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
  },
  sessionBottomNextMeta: {
    fontSize: 12,
  },
  restContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 18,
  },
  restCaption: {
    fontSize: 11,
    letterSpacing: 1.2,
  },
  circleTimerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  circleTimerValue: {
    fontSize: 52,
    lineHeight: 56,
  },
  circleTimerLabel: {
    fontSize: 16,
    textTransform: "lowercase",
  },
  restHeadline: {
    fontSize: 30,
    textAlign: "center",
    lineHeight: 34,
  },
  restDetail: {
    fontSize: 18,
    textAlign: "center",
  },
  restButtonsRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  addTimeBtn: {
    minWidth: 128,
  },
  addTimeBtnText: {
    fontSize: 16,
  },
  skipRestBtn: {
    minWidth: 170,
  },
  skipRestBtnText: {
    fontSize: 18,
  },
  completionScreen: {
    flex: 1,
  },
  completionScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 14,
  },
  completionGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  completionTop: {
    alignItems: "center",
    gap: 10,
  },
  completionCheckWrap: {
    width: 96,
    height: 96,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  completionTitle: {
    fontSize: 50,
    textAlign: "center",
    lineHeight: 52,
  },
  completionSubtitle: {
    fontSize: 18,
    textAlign: "center",
  },
  completionMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  completionGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 12,
  },
  completionStatCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    minHeight: 126,
  },
  completionStatValue: {
    fontSize: 46,
    lineHeight: 46,
  },
  completionStatUnit: {
    fontSize: 16,
    marginTop: 2,
    textTransform: "lowercase",
  },
  completionStatLabel: {
    marginTop: 8,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  comparisonCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  comparisonTitle: {
    fontSize: 15,
  },
  comparisonBody: {
    fontSize: 13,
  },
  comparisonMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  comparisonMetricCard: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 3,
  },
  comparisonMetricCurrent: {
    fontSize: 18,
    lineHeight: 20,
  },
  comparisonMetricLabel: {
    fontSize: 10,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  comparisonMetricPrevious: {
    fontSize: 12,
    lineHeight: 14,
  },
  regularityWrap: {
    gap: 8,
  },
  regularityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  regularityLabel: {
    width: 64,
    fontSize: 12,
  },
  regularityDots: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  regularityDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  comparisonDelta: {
    fontSize: 13,
  },
  prListCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  prListTitle: {
    fontSize: 15,
  },
  prListRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  prListExercise: {
    flex: 1,
    fontSize: 13,
  },
  prListValue: {
    fontSize: 13,
  },
  xpSummaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  xpSummaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  xpSummaryTitle: {
    fontSize: 15,
  },
  xpSummaryGain: {
    fontSize: 18,
  },
  xpSummarySubtitle: {
    fontSize: 13,
  },
  xpSummaryTrack: {
    marginTop: 2,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  xpSummaryFill: {
    height: "100%",
    borderRadius: 999,
  },
  levelUpCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  levelUpText: {
    flex: 1,
    fontSize: 13,
  },
  milestoneCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  milestoneText: {
    flex: 1,
    fontSize: 13,
  },
  completionActions: {
    marginTop: 6,
    gap: 12,
  },
  sharePrimaryBtn: {
    height: 62,
  },
  sharePrimaryBtnText: {
    fontSize: 18,
  },
  backHomeBtn: {
    height: 58,
  },
  backHomeBtnText: {
    fontSize: 17,
  },
  shareGhostBtn: {
    height: 48,
  },
  shareGhostText: {
    fontSize: 14,
  },
  fallbackText: {
    fontSize: 16,
  },
  fallbackBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  fallbackBtnText: {
    color: "#fff",
    fontSize: 15,
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    top: 10,
  },
  confettiPiece: {
    position: "absolute",
    top: -14,
    width: 8,
    height: 14,
    borderRadius: 2,
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    zIndex: 12,
  },
  pauseCard: {
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
    alignItems: "center",
  },
  pauseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pauseTitle: {
    fontSize: 30,
    lineHeight: 32,
    textAlign: "center",
  },
  pauseSubtitle: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  pauseActions: {
    width: "100%",
    gap: 10,
  },
  pauseResumeBtn: {
    height: 56,
  },
  pauseFinishBtn: {
    height: 48,
  },
  resumeCountdownBubble: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resumeCountdownValue: {
    fontSize: 66,
    lineHeight: 70,
    letterSpacing: -1.6,
  },
});
