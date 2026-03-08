import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useColorScheme,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/query-client";
import { PROGRAMS } from "@/data/programs";
import { EXERCISES } from "@/data/exercises";
import { Colors } from "@/constants/colors";

type Phase = "preview" | "active" | "rest" | "done";

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CircleTimer({ seconds, total, color }: { seconds: number; total: number; color: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const size = 160;
  const stroke = 8;
  const progress = total > 0 ? seconds / total : 0;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: theme.border,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: color,
          borderTopColor: progress > 0.75 ? color : "transparent",
          borderRightColor: progress > 0.5 ? color : "transparent",
          borderBottomColor: progress > 0.25 ? color : "transparent",
          borderLeftColor: progress > 0 ? color : "transparent",
          transform: [{ rotate: "-90deg" }],
        }}
      />
      <Text style={[styles.timerText, { color: theme.text, fontFamily: "Outfit_800ExtraBold" }]}>
        {formatTime(seconds)}
      </Text>
    </View>
  );
}

function CompletionScreen({ programId, totalMinutes, totalCalories, exercisesCount, onClose }: {
  programId: string;
  totalMinutes: number;
  totalCalories: number;
  exercisesCount: number;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { addSession } = useWorkout();
  const { isAuthenticated } = useAuth();
  const saved = useRef(false);
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);

  const program = PROGRAMS.find((p) => p.id === programId);
  const programName = program ? t(program.nameKey as Parameters<typeof t>[0]) : programId;

  useEffect(() => {
    if (!saved.current) {
      saved.current = true;
      addSession({
        programId,
        date: new Date().toISOString(),
        durationMin: totalMinutes,
        calories: totalCalories,
        completed: true,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [addSession, programId, totalCalories, totalMinutes]);

  const handleShare = async () => {
    if (sharing || shared) return;
    setSharing(true);
    try {
      await apiRequest("POST", "/api/posts", {
        type: "workout",
        content: `${t("strength")}: ${programName} — ${totalMinutes} ${t("minutes")}, ${totalCalories} ${t("kcal")}, ${exercisesCount} ${t("exercises")}`,
        workoutData: { programId, durationMin: totalMinutes, calories: totalCalories, exercisesCount, type: "strength" },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      setShared(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not share to feed");
    } finally {
      setSharing(false);
    }
  };

  return (
    <LinearGradient
      colors={["#FF6B2C", "#FF4D00"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.completionScreen}
    >
      <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.completionContent}>
        <View style={styles.trophyCircle}>
          <Ionicons name="trophy" size={52} color="#FF6B2C" />
        </View>

        <Text style={[styles.completionTitle, { fontFamily: "Outfit_800ExtraBold" }]}>
          {t("congratulations")}
        </Text>
        <Text style={[styles.completionSubtitle, { fontFamily: "Outfit_500Medium" }]}>
          {t("workoutCompleted")}
        </Text>
        <Text style={[styles.completionQuote, { fontFamily: "Outfit_400Regular" }]}>
          {t("greatJob")}
        </Text>

        <View style={styles.completionStats}>
          {[
            { icon: "time-outline", value: `${totalMinutes}`, label: t("totalMinutes") },
            { icon: "flame-outline", value: `${totalCalories}`, label: t("kcal") },
            { icon: "barbell-outline", value: `${exercisesCount}`, label: t("exercises") },
          ].map((stat, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(200 + i * 80).duration(400)} style={styles.completionStat}>
              <Ionicons name={stat.icon as any} size={20} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.completionStatValue, { fontFamily: "Outfit_700Bold" }]}>{stat.value}</Text>
              <Text style={[styles.completionStatLabel, { fontFamily: "Outfit_400Regular" }]}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.completionBtns}>
          {isAuthenticated && (
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.shareBtn,
                { opacity: pressed ? 0.85 : 1, backgroundColor: shared ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.25)" },
              ]}
            >
              <Ionicons name={shared ? "checkmark-circle" : "share-outline"} size={18} color="#fff" />
              <Text style={[styles.shareBtnText, { fontFamily: "Outfit_600SemiBold" }]}>
                {shared ? t("done") : t("shareToFeed")}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.doneBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={[styles.doneBtnText, { fontFamily: "Outfit_700Bold", color: "#FF6B2C" }]}>
              {t("done")}
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { getCustomization } = useWorkout();

  const program = PROGRAMS.find((p) => p.id === id);

  const workoutsWithEx = (program?.workouts ?? [])
    .map((w) => {
      const ex = EXERCISES.find((e) => e.id === w.exerciseId);
      const custom = program ? getCustomization(program.id, w.exerciseId) : {};
      return {
        ...w,
        exercise: ex,
        effectiveSets: custom.sets ?? w.sets,
        effectiveReps: custom.reps !== undefined ? custom.reps : w.reps,
        effectiveWeight: custom.weightKg ?? w.weightKg,
      };
    })
    .filter((w) => w.exercise != null);

  const [exIndex, setExIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("preview");
  const [elapsed, setElapsed] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  const elapsedRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentWorkout = workoutsWithEx[exIndex];
  const currentExercise = currentWorkout?.exercise;
  const nextWorkout = workoutsWithEx[exIndex + 1];

  useEffect(() => {
    if (phase === "active") {
      intervalRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "rest" && restLeft > 0) {
      restIntervalRef.current = setInterval(() => {
        setRestLeft((prev) => {
          if (prev <= 1) {
            clearInterval(restIntervalRef.current!);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            advanceAfterRest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current!);
    };
  }, [phase, restLeft]);

  const advanceAfterRest = () => {
    const nextSetIdx = setIndex + 1;
    if (nextSetIdx < (currentWorkout?.effectiveSets ?? 0)) {
      setSetIndex(nextSetIdx);
      setPhase("active");
    } else {
      const nextExIdx = exIndex + 1;
      if (nextExIdx < workoutsWithEx.length) {
        setExIndex(nextExIdx);
        setSetIndex(0);
        setPhase("active");
      } else {
        setPhase("done");
      }
    }
  };

  const handleSetDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const restSec = currentWorkout?.restSeconds ?? 60;
    setRestLeft(restSec);
    setPhase("rest");
  };

  const handleSkipRest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (restIntervalRef.current) clearInterval(restIntervalRef.current!);
    advanceAfterRest();
  };

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("active");
  };

  const handleFinishEarly = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (restIntervalRef.current) clearInterval(restIntervalRef.current!);
    setPhase("done");
  };

  const handleClose = () => {
    router.back();
  };

  if (!program || workoutsWithEx.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={[{ color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>{t("errorLoading")}</Text>
        <Pressable onPress={() => router.back()} style={[styles.fallbackBtn, { backgroundColor: theme.accent }]}>
          <Text style={{ color: "#fff", fontFamily: "Outfit_600SemiBold" }}>{t("back")}</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === "done") {
    const totalMin = Math.max(1, Math.round(elapsedRef.current / 60));
    const totalCal = Math.round((program.caloriesPerSession * totalMin) / program.durationMin);
    return (
      <CompletionScreen
        programId={program.id}
        totalMinutes={totalMin}
        totalCalories={totalCal}
        exercisesCount={workoutsWithEx.length}
        onClose={handleClose}
      />
    );
  }

  const exT = currentExercise?.translations?.[language as keyof typeof currentExercise.translations]
    ?? currentExercise?.translations?.en;
  const nextExT = nextWorkout?.exercise?.translations?.[language as keyof typeof nextWorkout.exercise.translations]
    ?? nextWorkout?.exercise?.translations?.en;

  const overallProgress = (exIndex * (currentWorkout?.effectiveSets ?? 1) + setIndex) /
    (workoutsWithEx.reduce((s, w) => s + w.effectiveSets, 0));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[program.gradient[0] + "30", "transparent"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={handleFinishEarly} style={[styles.topBtn, { backgroundColor: theme.card }]}>
          <Ionicons name="close" size={20} color={theme.text} />
        </Pressable>

        <View style={styles.progressWrap}>
          <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { width: `${Math.round(overallProgress * 100)}%` as any, backgroundColor: program.gradient[0] }]} />
          </View>
          <Text style={[styles.progressLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
            {exIndex + 1}/{workoutsWithEx.length}
          </Text>
        </View>

        <View style={[styles.timerBadge, { backgroundColor: theme.card }]}>
          <Ionicons name="time-outline" size={14} color={theme.accent} />
          <Text style={[styles.timerBadgeText, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
            {formatTime(elapsed)}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.sessionContent}
        showsVerticalScrollIndicator={false}
      >
        {phase === "preview" && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.phaseBlock}>
            <View style={[styles.exIconLarge, { backgroundColor: (currentExercise?.imageColor ?? "#FF6B2C") + "25" }]}>
              <MaterialCommunityIcons name="dumbbell" size={60} color={currentExercise?.imageColor ?? "#FF6B2C"} />
            </View>

            <Text style={[styles.exNameLarge, { color: theme.text, fontFamily: "Outfit_800ExtraBold" }]}>
              {exT?.name}
            </Text>
            <Text style={[styles.exDesc, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
              {exT?.description}
            </Text>

            <View style={styles.setInfoRow}>
              <View style={[styles.setInfoCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.setInfoValue, { color: program.gradient[0], fontFamily: "Outfit_800ExtraBold" }]}>
                  {currentWorkout?.effectiveSets}
                </Text>
                <Text style={[styles.setInfoLabel, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                  {t("sets")}
                </Text>
              </View>
              <View style={[styles.setInfoCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.setInfoValue, { color: program.gradient[0], fontFamily: "Outfit_800ExtraBold" }]}>
                  {currentWorkout?.effectiveReps}
                </Text>
                <Text style={[styles.setInfoLabel, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                  {typeof currentWorkout?.effectiveReps === "number" ? t("reps") : ""}
                </Text>
              </View>
              {(currentWorkout?.effectiveWeight ?? 0) > 0 && (
                <View style={[styles.setInfoCard, { backgroundColor: theme.card }]}>
                  <Text style={[styles.setInfoValue, { color: program.gradient[0], fontFamily: "Outfit_800ExtraBold" }]}>
                    {currentWorkout?.effectiveWeight}
                  </Text>
                  <Text style={[styles.setInfoLabel, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                    {t("kg")}
                  </Text>
                </View>
              )}
              {!(currentWorkout?.effectiveWeight) && (
                <View style={[styles.setInfoCard, { backgroundColor: theme.card }]}>
                  <Text style={[styles.setInfoValue, { color: program.gradient[0], fontFamily: "Outfit_800ExtraBold" }]}>
                    {currentWorkout?.restSeconds}
                  </Text>
                  <Text style={[styles.setInfoLabel, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                    {t("rest")}
                  </Text>
                </View>
              )}
            </View>

            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.bigBtn,
                { backgroundColor: program.gradient[0], opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <Ionicons name="play" size={22} color="#fff" />
              <Text style={[styles.bigBtnText, { fontFamily: "Outfit_700Bold" }]}>{t("startSet")}</Text>
            </Pressable>
          </Animated.View>
        )}

        {phase === "active" && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.phaseBlock}>
            <Text style={[styles.setLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
              {t("set")} {setIndex + 1} {t("of")} {currentWorkout?.effectiveSets}
            </Text>

            <View style={[styles.exIconLarge, { backgroundColor: (currentExercise?.imageColor ?? "#FF6B2C") + "25" }]}>
              <MaterialCommunityIcons name="dumbbell" size={60} color={currentExercise?.imageColor ?? "#FF6B2C"} />
            </View>

            <Text style={[styles.exNameLarge, { color: theme.text, fontFamily: "Outfit_800ExtraBold" }]}>
              {exT?.name}
            </Text>

            <View style={[styles.repsDisplay, { backgroundColor: theme.card }]}>
              <Text style={[styles.repsValue, { color: program.gradient[0], fontFamily: "Outfit_800ExtraBold" }]}>
                {currentWorkout?.effectiveReps}
              </Text>
              <Text style={[styles.repsUnit, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                {typeof currentWorkout?.effectiveReps === "number" ? t("reps") : ""}
              </Text>
            </View>

            {(currentWorkout?.effectiveWeight ?? 0) > 0 && (
              <View style={[styles.weightBadge, { backgroundColor: theme.card }]}>
                <Ionicons name="barbell-outline" size={16} color={program.gradient[0]} />
                <Text style={[styles.weightBadgeText, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
                  {currentWorkout?.effectiveWeight} {t("kg")}
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleSetDone}
              style={({ pressed }) => [
                styles.bigBtn,
                { backgroundColor: program.gradient[0], opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <Ionicons name="checkmark" size={22} color="#fff" />
              <Text style={[styles.bigBtnText, { fontFamily: "Outfit_700Bold" }]}>{t("setComplete")}</Text>
            </Pressable>

            {nextWorkout?.exercise && (
              <View style={[styles.upNextCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.upNextLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                  {t("upNext")}
                </Text>
                <Text style={[styles.upNextName, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
                  {nextExT?.name}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {phase === "rest" && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.phaseBlock}>
            <Text style={[styles.restTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
              {t("resting")}
            </Text>
            <Text style={[styles.restSubtitle, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
              {t("wellDone")}
            </Text>

            <CircleTimer
              seconds={restLeft}
              total={currentWorkout?.restSeconds ?? 60}
              color={program.gradient[0]}
            />

            <Pressable
              onPress={handleSkipRest}
              style={({ pressed }) => [
                styles.skipBtn,
                { backgroundColor: theme.card, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="play-skip-forward" size={18} color={theme.accent} />
              <Text style={[styles.skipBtnText, { color: theme.accent, fontFamily: "Outfit_600SemiBold" }]}>
                {t("skipRest")}
              </Text>
            </Pressable>

            {(setIndex + 1 < (currentWorkout?.effectiveSets ?? 0)) ? (
              <View style={[styles.upNextCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.upNextLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                  {t("nextSet")}
                </Text>
                <Text style={[styles.upNextName, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
                  {exT?.name} · {t("set")} {setIndex + 2}
                </Text>
              </View>
            ) : nextWorkout?.exercise ? (
              <View style={[styles.upNextCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.upNextLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                  {t("nextExercise")}
                </Text>
                <Text style={[styles.upNextName, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
                  {nextExT?.name}
                </Text>
              </View>
            ) : (
              <View style={[styles.upNextCard, { backgroundColor: theme.card }]}>
                <Text style={[styles.upNextLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                  {t("allExercisesDone")}
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {phase === "active" && (
        <Animated.View entering={FadeInUp.duration(300)} style={[styles.bottomBar, { paddingBottom: insets.bottom + 8, backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <Pressable
            onPress={handleFinishEarly}
            style={({ pressed }) => [styles.finishEarlyBtn, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.finishEarlyText, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
              {t("finishWorkout")}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: { flex: 1, gap: 4 },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 11, textAlign: "right" },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerBadgeText: { fontSize: 13 },
  sessionContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  phaseBlock: { width: "100%", alignItems: "center", gap: 18 },
  exIconLarge: {
    width: 140,
    height: 140,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  exNameLarge: { fontSize: 28, textAlign: "center" },
  exDesc: { fontSize: 14, textAlign: "center", lineHeight: 22, paddingHorizontal: 10 },
  setLabel: { fontSize: 14 },
  setInfoRow: { flexDirection: "row", gap: 12, width: "100%" },
  setInfoCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: "center", gap: 4 },
  setInfoValue: { fontSize: 28 },
  setInfoLabel: { fontSize: 12 },
  repsDisplay: { paddingHorizontal: 40, paddingVertical: 20, borderRadius: 24, alignItems: "center" },
  repsValue: { fontSize: 56, lineHeight: 60 },
  repsUnit: { fontSize: 16 },
  weightBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 12 },
  weightBadgeText: { fontSize: 16 },
  bigBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    height: 60,
    borderRadius: 18,
  },
  bigBtnText: { color: "#fff", fontSize: 18 },
  upNextCard: {
    width: "100%",
    padding: 16,
    borderRadius: 14,
    gap: 4,
  },
  upNextLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  upNextName: { fontSize: 15 },
  restTitle: { fontSize: 28, marginTop: 8 },
  restSubtitle: { fontSize: 16 },
  timerText: { fontSize: 36 },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  skipBtnText: { fontSize: 15 },
  bottomBar: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  finishEarlyBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  finishEarlyText: { fontSize: 15 },
  completionScreen: { flex: 1, justifyContent: "center", alignItems: "center" },
  completionContent: { width: "100%", alignItems: "center", padding: 32, gap: 16 },
  trophyCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  completionTitle: { color: "#fff", fontSize: 32, textAlign: "center" },
  completionSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 18 },
  completionQuote: { color: "rgba(255,255,255,0.7)", fontSize: 14, textAlign: "center", lineHeight: 22 },
  completionStats: { flexDirection: "row", gap: 20, marginTop: 8 },
  completionStat: { alignItems: "center", gap: 4 },
  completionStatValue: { color: "#fff", fontSize: 22 },
  completionStatLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
  completionBtns: { width: "100%", marginTop: 16, gap: 12 },
  shareBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareBtnText: { color: "#fff", fontSize: 15 },
  doneBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: { fontSize: 17 },
  fallbackBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
});
