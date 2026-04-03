import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
  Platform,
  ScrollView,
  Dimensions,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/query-client";
import { PROGRAMS } from "@/data/programs";
import { EXERCISES } from "@/data/exercises";
import { Colors } from "@/constants/colors";
import { GhostButton, PrimaryButton } from "@/components/ui";

type CardioPhase = "preview" | "active" | "rest" | "done";

const { width: SW } = Dimensions.get("window");
const RING_SIZE = Math.min(SW * 0.65, 260);
const STROKE = 10;
const R = (RING_SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m > 0 ? m + ":" : ""}${String(s).padStart(2, "0")}`;
}

function getRecommendedMinutes(
  baseDuration: number,
  level: string,
  objective: string
): number {
  const lvl: Record<string, number> = { beginner: 0.8, intermediate: 1.0, advanced: 1.3 };
  const obj: Record<string, number> = {
    weightLoss: 1.2,
    endurance: 1.3,
    massMuscle: 0.85,
    recomposition: 1.0,
  };
  return Math.round(baseDuration * (lvl[level] ?? 1) * (obj[objective] ?? 1));
}

function CardioRing({
  value,
  total,
  color,
  isPaused,
  pauseLabel,
}: {
  value: number;
  total: number;
  color: string;
  isPaused: boolean;
  pauseLabel: string;
}) {
  const pct = total > 0 ? value / total : 0;
  const offset = CIRC * (1 - pct);
  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" }}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={R}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={R}
          stroke={isPaused ? "rgba(255,255,255,0.4)" : color}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRC}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90, ${RING_SIZE / 2}, ${RING_SIZE / 2})`}
        />
      </Svg>
      <Text style={[styles.ringTime, { color: "#fff" }]}>{formatTime(value)}</Text>
      {isPaused && (
        <Text style={[styles.pausedLabel, { color: "rgba(255,255,255,0.6)" }]}>{pauseLabel}</Text>
      )}
    </View>
  );
}

export default function CardioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { profile, addSession } = useWorkout();
  const { isAuthenticated } = useAuth();
  const [shared, setShared] = useState(false);
  const [sharingPost, setSharingPost] = useState(false);

  const program = PROGRAMS.find((p) => p.id === id);

  const workoutsWithEx = (program?.workouts ?? [])
    .map((w) => ({ ...w, exercise: EXERCISES.find((e) => e.id === w.exerciseId) }))
    .filter((w) => w.exercise != null);

  const [exIndex, setExIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<CardioPhase>("preview");
  const [countdown, setCountdown] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [totalCalories, setTotalCalories] = useState(0);
  const [customDuration, setCustomDuration] = useState<number | null>(null);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  const exIndexRef = useRef(0);
  const setIndexRef = useRef(0);
  const durationRef = useRef(30);

  const currentWorkout = workoutsWithEx[exIndex];
  const currentExercise = currentWorkout?.exercise;
  const nextWorkout = workoutsWithEx[exIndex + 1] ?? null;

  const effectiveDuration = customDuration ?? currentWorkout?.durationSeconds ?? 30;

  useEffect(() => { exIndexRef.current = exIndex; }, [exIndex]);
  useEffect(() => { setIndexRef.current = setIndex; }, [setIndex]);
  useEffect(() => { durationRef.current = effectiveDuration; }, [effectiveDuration]);

  const exT = currentExercise?.translations?.[language as keyof typeof currentExercise.translations]
    ?? currentExercise?.translations?.en;
  const nextExT = nextWorkout?.exercise?.translations?.[language as keyof typeof nextWorkout.exercise.translations]
    ?? nextWorkout?.exercise?.translations?.en;

  const recommendedMin = program
    ? getRecommendedMinutes(program.durationMin, profile.level, profile.objective)
    : 20;

  const totalIntervals = workoutsWithEx.reduce((s, w) => s + w.sets, 0);
  const completedIntervals = workoutsWithEx.slice(0, exIndex).reduce((s, w) => s + w.sets, 0) + setIndex;
  const overallPct = totalIntervals > 0 ? completedIntervals / totalIntervals : 0;

  const clearAllTimers = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (restRef.current) clearInterval(restRef.current);
    if (elapsedRef.current) clearInterval(elapsedRef.current);
  };

  const startElapsedTimer = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current);
    elapsedRef.current = setInterval(() => {
      setTotalElapsed((p) => p + 1);
    }, 1000);
  };

  const advanceAfterRest = useCallback(() => {
    const curSetIdx = setIndexRef.current;
    const curExIdx = exIndexRef.current;
    const curWorkout = workoutsWithEx[curExIdx];
    const nextSetIdx = curSetIdx + 1;
    if (nextSetIdx < (curWorkout?.sets ?? 1)) {
      setSetIndex(nextSetIdx);
      setPhase("preview");
      setCustomDuration(null);
    } else {
      const nextExIdx = curExIdx + 1;
      if (nextExIdx < workoutsWithEx.length) {
        setExIndex(nextExIdx);
        setSetIndex(0);
        setPhase("preview");
        setCustomDuration(null);
      } else {
        if (elapsedRef.current) clearInterval(elapsedRef.current);
        setPhase("done");
      }
    }
  }, [workoutsWithEx]);

  const handleIntervalDone = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const curExIdx = exIndexRef.current;
    const curWorkout = workoutsWithEx[curExIdx];
    const curExercise = curWorkout?.exercise;
    const calPerSec = (curExercise?.calories ?? 8) / 60;
    setTotalCalories((p) => p + Math.round(calPerSec * durationRef.current));
    const restSec = curWorkout?.restSeconds ?? 30;
    setRestLeft(restSec);
    setPhase("rest");
    restRef.current = setInterval(() => {
      setRestLeft((prev) => {
        if (prev <= 1) {
          clearInterval(restRef.current!);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          advanceAfterRest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [workoutsWithEx, advanceAfterRest]);

  const startCountdown = useCallback((duration: number) => {
    setCountdown(duration);
    isPausedRef.current = false;
    setIsPaused(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          handleIntervalDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [handleIntervalDone]);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (phase === "preview" && totalElapsed === 0) {
      startElapsedTimer();
    } else if (phase === "preview") {
      startElapsedTimer();
    }
    setPhase("active");
    startCountdown(effectiveDuration);
  };

  const handlePauseResume = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPausedRef.current) {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    } else {
      startElapsedTimer();
    }
  };

  const handleSkipInterval = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (countdownRef.current) clearInterval(countdownRef.current);
    handleIntervalDone();
  };

  const handleSkipRest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (restRef.current) clearInterval(restRef.current);
    advanceAfterRest();
  };

  const handleFinishEarly = () => {
    clearAllTimers();
    if (totalElapsed > 30) {
      saveSession();
      setPhase("done");
    } else {
      router.back();
    }
  };

  const saveSession = () => {
    const durationMin = Math.max(1, Math.round(totalElapsed / 60));
    addSession({
      programId: id ?? "",
      date: new Date().toISOString(),
      durationMin,
      calories: totalCalories,
      completed: true,
      type: "cardio",
    });
  };

  const handleShareToFeed = async () => {
    if (sharingPost || shared) return;
    setSharingPost(true);
    const programName = program ? t(program.nameKey as Parameters<typeof t>[0]) : id;
    const durationMin = Math.max(1, Math.round(totalElapsed / 60));
    try {
      await apiRequest("POST", "/api/posts", {
        type: "workout",
        content: `Cardio: ${programName} — ${durationMin} ${t("minutes")}, ${totalCalories} ${t("kcal")}, ${totalIntervals} ${t("sets")}`,
        workoutData: { programId: id, durationMin, calories: totalCalories, totalIntervals, type: "cardio" },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      setShared(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not share to feed");
    } finally {
      setSharingPost(false);
    }
  };

  const handleFinishAndSave = () => {
    saveSession();
    router.dismissAll();
    router.push("/(tabs)");
  };

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  const adjustDuration = (delta: number) => {
    const base = customDuration ?? effectiveDuration;
    const next = Math.max(10, Math.min(600, base + delta));
    setCustomDuration(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!program || workoutsWithEx.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: theme.text }}>{t("programNotFound" as any)}</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.accent }}>{t("back")}</Text>
        </Pressable>
      </View>
    );
  }

  const webTop = Platform.OS === "web" ? 67 : 0;

  if (phase === "done") {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + webTop }]}>
        <View style={[styles.doneTopGlow, { backgroundColor: `${program.gradient[0]}22` }]} />
        <Animated.View entering={FadeIn.duration(400)} style={styles.doneContainer}>
          <View style={styles.doneIconWrap}>
            <Ionicons name="checkmark-circle" size={72} color="#fff" />
          </View>
          <Text style={[styles.doneTitle, { fontFamily: "Syne_800ExtraBold" }]}>
            {t("cardioComplete")}
          </Text>
          <Text style={[styles.doneSubtitle, { fontFamily: "DMSans_400Regular" }]}>
            {t("greatJob")}
          </Text>

          <View style={styles.doneSummaryRow}>
            <View style={styles.doneStat}>
              <Ionicons name="time-outline" size={22} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.doneStatValue, { fontFamily: "Syne_700Bold" }]}>
                {Math.round(totalElapsed / 60)} {t("minutes")}
              </Text>
              <Text style={[styles.doneStatLabel, { fontFamily: "DMSans_400Regular" }]}>
                {t("workoutTime")}
              </Text>
            </View>
            <View style={styles.doneSeparator} />
            <View style={styles.doneStat}>
              <Ionicons name="flame-outline" size={22} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.doneStatValue, { fontFamily: "Syne_700Bold" }]}>
                {totalCalories} {t("kcal")}
              </Text>
              <Text style={[styles.doneStatLabel, { fontFamily: "DMSans_400Regular" }]}>
                {t("caloriesBurned")}
              </Text>
            </View>
            <View style={styles.doneSeparator} />
            <View style={styles.doneStat}>
              <Ionicons name="repeat-outline" size={22} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.doneStatValue, { fontFamily: "Syne_700Bold" }]}>
                {totalIntervals}
              </Text>
              <Text style={[styles.doneStatLabel, { fontFamily: "DMSans_400Regular" }]}>
                {t("sets")}
              </Text>
            </View>
          </View>

          {isAuthenticated && (
            <PrimaryButton
              label={shared ? t("done") : t("shareToFeed")}
              icon={shared ? "checkmark-circle" : "share-outline"}
              onPress={handleShareToFeed}
              loading={sharingPost}
              style={[styles.doneSaveBtn, shared ? styles.doneSaveBtnSecondary : null, { marginBottom: 12 }]}
              textStyle={styles.doneSaveBtnText}
            />
          )}

          <PrimaryButton
            label={t("saveAndFinish")}
            icon="checkmark"
            onPress={handleFinishAndSave}
            style={styles.doneSaveBtn}
            textStyle={styles.doneSaveBtnText}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.topGlow, { backgroundColor: `${program.gradient[0]}18` }]} />

      <View style={[styles.topBar, { paddingTop: insets.top + webTop + 8 }]}>
        <Pressable
          onPress={handleFinishEarly}
          style={[styles.topBtn, { backgroundColor: theme.card }]}
        >
          <Ionicons name="close" size={20} color={theme.text} />
        </Pressable>

        <View style={styles.progressWrap}>
          <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(overallPct * 100)}%` as any, backgroundColor: program.gradient[0] },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>
            {completedIntervals}/{totalIntervals}
          </Text>
        </View>

        <View style={[styles.timerBadge, { backgroundColor: theme.card }]}>
          <Ionicons name="time-outline" size={14} color={theme.accent} />
          <Text style={[styles.timerBadgeText, { color: theme.text, fontFamily: "DMSans_600SemiBold" }]}>
            {formatTime(totalElapsed)}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 34 }]}
        showsVerticalScrollIndicator={false}
      >
        {phase === "preview" && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.phaseBlock}>
            <View style={[styles.exIcon, { backgroundColor: (currentExercise?.imageColor ?? program.gradient[0]) + "25" }]}>
              <Ionicons
                name={currentExercise?.isCardio && currentExercise.equipment === "cardioMachine" ? "bicycle-outline" : "walk-outline"}
                size={60}
                color={currentExercise?.imageColor ?? program.gradient[0]}
              />
            </View>

            <Text style={[styles.exName, { color: theme.text, fontFamily: "Syne_800ExtraBold" }]}>
              {exT?.name}
            </Text>
            <Text style={[styles.exDesc, { color: theme.textSecondary, fontFamily: "DMSans_400Regular" }]}>
              {exT?.description}
            </Text>

            <View style={styles.metaRow}>
              <View style={[styles.metaCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metaValue, { color: program.gradient[0], fontFamily: "Syne_800ExtraBold" }]}>
                  {currentWorkout?.sets}
                </Text>
                <Text style={[styles.metaLabel, { color: theme.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                  {t("round")}{currentWorkout?.sets !== 1 ? "s" : ""}
                </Text>
              </View>

              <View style={[styles.metaCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metaValue, { color: program.gradient[0], fontFamily: "Syne_800ExtraBold" }]}>
                  {formatTime(effectiveDuration)}
                </Text>
                <Text style={[styles.metaLabel, { color: theme.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                  {t("duration")}
                </Text>
              </View>

              <View style={[styles.metaCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.metaValue, { color: program.gradient[0], fontFamily: "Syne_800ExtraBold" }]}>
                  {currentWorkout?.restSeconds}s
                </Text>
                <Text style={[styles.metaLabel, { color: theme.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                  {t("rest")}
                </Text>
              </View>
            </View>

            <View style={[styles.adjustRow, { backgroundColor: theme.card }]}>
              <Text style={[styles.adjustLabel, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>
                {t("adjustDuration")}
              </Text>
              <View style={styles.adjustControls}>
                <Pressable
                  onPress={() => adjustDuration(-10)}
                  style={[styles.adjustBtn, { backgroundColor: theme.border }]}
                >
                  <Ionicons name="remove" size={18} color={theme.text} />
                </Pressable>
                <Text style={[styles.adjustValue, { color: theme.text, fontFamily: "Syne_700Bold" }]}>
                  {formatTime(effectiveDuration)}
                </Text>
                <Pressable
                  onPress={() => adjustDuration(10)}
                  style={[styles.adjustBtn, { backgroundColor: theme.border }]}
                >
                  <Ionicons name="add" size={18} color={theme.text} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.recommendedBadge, { backgroundColor: program.gradient[0] + "20" }]}>
              <Ionicons name="bulb-outline" size={15} color={program.gradient[0]} />
              <Text style={[styles.recommendedText, { color: program.gradient[0], fontFamily: "DMSans_500Medium" }]}>
                {t("recommendedTime")}: {recommendedMin} {t("minutes")} · {t(profile.level)} · {t(profile.objective as any)}
              </Text>
            </View>

            <PrimaryButton
              label={setIndex === 0 && exIndex === 0 ? t("startInterval") : t("nextRound")}
              icon="play"
              onPress={handleStart}
              style={[styles.bigBtn, { backgroundColor: program.gradient[0] }]}
              textStyle={styles.bigBtnText}
            />

            {nextWorkout?.exercise && (
              <View style={[styles.upNextCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.upNextLabel, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>
                  {t("upNext")}
                </Text>
                <Text style={[styles.upNextName, { color: theme.text, fontFamily: "DMSans_600SemiBold" }]}>
                  {nextExT?.name}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {phase === "active" && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.phaseBlock}>
            <Text style={[styles.roundLabel, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}>
              {t("round")} {setIndex + 1} {t("of")} {currentWorkout?.sets}
            </Text>

            <Text style={[styles.exNameActive, { color: theme.text, fontFamily: "Syne_800ExtraBold" }]}>
              {exT?.name}
            </Text>

            <CardioRing
              value={countdown}
              total={effectiveDuration}
              color={program.gradient[0]}
              isPaused={isPaused}
              pauseLabel={t("pause").toUpperCase()}
            />

            <View style={styles.activeControls}>
              <Pressable
                onPress={handlePauseResume}
                style={({ pressed }) => [
                  styles.controlBtn,
                  { backgroundColor: theme.card, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons name={isPaused ? "play" : "pause"} size={24} color={program.gradient[0]} />
                <Text style={[styles.controlBtnText, { color: program.gradient[0], fontFamily: "DMSans_600SemiBold" }]}>
                  {isPaused ? t("resume") : t("pause")}
                </Text>
              </Pressable>

              <PrimaryButton
                label={t("intervalComplete")}
                icon="checkmark"
                onPress={handleSkipInterval}
                style={[styles.bigBtn, styles.bigBtnCompact, { backgroundColor: program.gradient[0] }]}
                textStyle={styles.bigBtnText}
              />
            </View>
          </Animated.View>
        )}

        {phase === "rest" && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.phaseBlock}>
            <Text style={[styles.restTitle, { color: theme.text, fontFamily: "Syne_700Bold" }]}>
              {t("resting")}
            </Text>
            <Text style={[styles.restSub, { color: theme.textSecondary, fontFamily: "DMSans_400Regular" }]}>
              {t("wellDone")}
            </Text>

            <CardioRing
              value={restLeft}
              total={currentWorkout?.restSeconds ?? 30}
              color="#666"
              isPaused={false}
              pauseLabel=""
            />

            <GhostButton
              label={t("skipRest")}
              onPress={handleSkipRest}
              style={[styles.skipBtn, { backgroundColor: theme.card }]}
              textStyle={[styles.skipBtnText, { color: theme.accent }]}
            />

            {setIndex + 1 < (currentWorkout?.sets ?? 1) ? (
              <View style={[styles.upNextCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.upNextLabel, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>
                  {t("nextRound")}
                </Text>
                <Text style={[styles.upNextName, { color: theme.text, fontFamily: "DMSans_600SemiBold" }]}>
                  {exT?.name} · {t("round")} {setIndex + 2}
                </Text>
              </View>
            ) : nextWorkout?.exercise ? (
              <View style={[styles.upNextCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.upNextLabel, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>
                  {t("nextExercise")}
                </Text>
                <Text style={[styles.upNextName, { color: theme.text, fontFamily: "DMSans_600SemiBold" }]}>
                  {nextExT?.name}
                </Text>
              </View>
            ) : (
              <View style={[styles.upNextCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.upNextLabel, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>
                  {t("allExercisesDone")}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topGlow: {
    ...StyleSheet.absoluteFillObject,
    height: "52%",
  },
  doneTopGlow: {
    ...StyleSheet.absoluteFillObject,
    height: "55%",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  topBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  progressWrap: { flex: 1, gap: 4 },
  progressBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressLabel: { fontSize: 11 },
  timerBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  timerBadgeText: { fontSize: 13 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  phaseBlock: { alignItems: "center", gap: 16 },
  exIcon: {
    width: 120, height: 120, borderRadius: 32,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  exName: { fontSize: 26, textAlign: "center" },
  exDesc: { fontSize: 14, textAlign: "center", lineHeight: 20, opacity: 0.8 },
  metaRow: { flexDirection: "row", gap: 10, width: "100%" },
  metaCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: "center", gap: 4 },
  metaValue: { fontSize: 22 },
  metaLabel: { fontSize: 11 },
  adjustRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    width: "100%", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
  },
  adjustLabel: { fontSize: 13 },
  adjustControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  adjustBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  adjustValue: { fontSize: 18, minWidth: 50, textAlign: "center" },
  recommendedBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    width: "100%", borderRadius: 14, padding: 12,
  },
  recommendedText: { fontSize: 12, flex: 1, flexWrap: "wrap" },
  bigBtn: {
    width: "100%",
    borderRadius: 18,
    height: 56,
  },
  bigBtnCompact: { height: 50 },
  bigBtnText: { fontSize: 17 },
  upNextCard: { width: "100%", borderRadius: 16, padding: 14, gap: 4 },
  upNextLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  upNextName: { fontSize: 16 },
  roundLabel: { fontSize: 14, textTransform: "uppercase", letterSpacing: 1 },
  exNameActive: { fontSize: 22, textAlign: "center", marginBottom: 8 },
  ringTime: { fontSize: 46, fontFamily: "Syne_800ExtraBold" },
  pausedLabel: { fontSize: 13, fontFamily: "DMSans_600SemiBold", marginTop: 2 },
  activeControls: { flexDirection: "row", gap: 10, width: "100%", alignItems: "center" },
  controlBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 16, paddingVertical: 14,
  },
  controlBtnText: { fontSize: 15 },
  restTitle: { fontSize: 24, marginBottom: 4 },
  restSub: { fontSize: 15, marginBottom: 8 },
  skipBtn: { width: "100%", borderRadius: 16, height: 50 },
  skipBtnText: { fontSize: 15 },
  doneContainer: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 24, gap: 16,
  },
  doneIconWrap: { marginBottom: 8 },
  doneTitle: { fontSize: 26, color: "#fff", textAlign: "center" },
  doneSubtitle: { fontSize: 15, color: "rgba(255,255,255,0.75)", textAlign: "center", marginBottom: 8 },
  doneSummaryRow: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20, padding: 20, width: "100%",
  },
  doneStat: { flex: 1, alignItems: "center", gap: 4 },
  doneStatValue: { fontSize: 18, color: "#fff" },
  doneStatLabel: { fontSize: 11, color: "rgba(255,255,255,0.7)" },
  doneSeparator: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 8 },
  doneSaveBtn: {
    width: "100%",
    borderRadius: 18,
    height: 56,
    marginTop: 8,
  },
  doneSaveBtnSecondary: { backgroundColor: "rgba(255,255,255,0.22)" },
  doneSaveBtnText: { fontSize: 17 },
});
