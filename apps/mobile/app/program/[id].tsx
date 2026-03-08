import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  useColorScheme,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { ExerciseCustomization, useWorkout } from "@/contexts/WorkoutContext";
import { PROGRAMS } from "@/data/programs";
import { EXERCISES } from "@/data/exercises";
import { Colors } from "@/constants/colors";

type EditableExercise = {
  exerciseId: string;
  defaultSets: number;
  defaultReps: number | string;
  defaultWeight?: number;
  recommendedWeight?: number;
};

function Stepper({
  value,
  onDecrement,
  onIncrement,
  minValue = 1,
  step = 1,
  suffix = "",
  accentColor,
  theme,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  minValue?: number;
  step?: number;
  suffix?: string;
  accentColor: string;
  theme: typeof Colors.dark;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => { if (value > minValue) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDecrement(); } }}
        style={[styles.stepBtn, { backgroundColor: value <= minValue ? theme.border : accentColor + "20" }]}
      >
        <Ionicons name="remove" size={18} color={value <= minValue ? theme.textMuted : accentColor} />
      </Pressable>
      <Text style={[styles.stepValue, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
        {value}{suffix}
      </Text>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onIncrement(); }}
        style={[styles.stepBtn, { backgroundColor: accentColor + "20" }]}
      >
        <Ionicons name="add" size={18} color={accentColor} />
      </Pressable>
    </View>
  );
}

function EditExerciseModal({
  visible,
  onClose,
  onSave,
  onReset,
  item,
  exerciseName,
  accentColor,
  theme,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ExerciseCustomization) => void;
  onReset: () => void;
  item: EditableExercise;
  exerciseName: string;
  accentColor: string;
  theme: typeof Colors.dark;
  t: (key: any) => string;
}) {
  const [sets, setSets] = useState(item.defaultSets);
  const [reps, setReps] = useState(
    typeof item.defaultReps === "number" ? item.defaultReps : 0
  );
  const [weight, setWeight] = useState(item.defaultWeight ?? item.recommendedWeight ?? 0);
  const isTimedRep = typeof item.defaultReps === "string";

  React.useEffect(() => {
    if (visible) {
      setSets(item.defaultSets);
      setReps(typeof item.defaultReps === "number" ? item.defaultReps : 0);
      setWeight(item.defaultWeight ?? item.recommendedWeight ?? 0);
    }
  }, [visible, item]);

  const handleSave = () => {
    const data: ExerciseCustomization = { sets };
    if (!isTimedRep) data.reps = reps;
    if ((item.recommendedWeight ?? 0) > 0 || (item.defaultWeight ?? 0) > 0) data.weightKg = weight;
    onSave(data);
  };

  const hasWeight = (item.recommendedWeight ?? 0) > 0 || (item.defaultWeight ?? 0) > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.editSheet, { backgroundColor: theme.card }]} onPress={() => {}}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <Text style={[styles.editTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]} numberOfLines={2}>
            {exerciseName}
          </Text>

          <View style={styles.editRows}>
            <View style={styles.editRow}>
              <Text style={[styles.editRowLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                {t("sets")}
              </Text>
              <Stepper
                value={sets}
                onDecrement={() => setSets(s => Math.max(1, s - 1))}
                onIncrement={() => setSets(s => s + 1)}
                minValue={1}
                accentColor={accentColor}
                theme={theme}
              />
            </View>

            {!isTimedRep && (
              <View style={styles.editRow}>
                <Text style={[styles.editRowLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                  {t("reps")}
                </Text>
                <Stepper
                  value={reps}
                  onDecrement={() => setReps(r => Math.max(1, r - 1))}
                  onIncrement={() => setReps(r => r + 1)}
                  minValue={1}
                  accentColor={accentColor}
                  theme={theme}
                />
              </View>
            )}

            {hasWeight && (
              <View style={styles.editRow}>
                <View>
                  <Text style={[styles.editRowLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                    {t("weightLabel")}
                  </Text>
                  {item.recommendedWeight != null && (
                    <Text style={[styles.recommendedText, { color: theme.textMuted, fontFamily: "Outfit_400Regular" }]}>
                      Conseillé : {item.recommendedWeight} kg
                    </Text>
                  )}
                </View>
                <Stepper
                  value={weight}
                  onDecrement={() => setWeight(w => Math.max(0, Math.round((w - 2.5) * 10) / 10))}
                  onIncrement={() => setWeight(w => Math.round((w + 2.5) * 10) / 10)}
                  minValue={0}
                  step={2.5}
                  suffix=" kg"
                  accentColor={accentColor}
                  theme={theme}
                />
              </View>
            )}
          </View>

          <View style={styles.editActions}>
            <Pressable
              onPress={() => { onReset(); onClose(); }}
              style={({ pressed }) => [styles.resetBtn, { borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.resetBtnText, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                {t("resetToDefault")}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { handleSave(); onClose(); }}
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: accentColor, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.saveBtnText, { fontFamily: "Outfit_700Bold" }]}>{t("save")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const { getCustomization, updateCustomization, resetCustomization } = useWorkout();

  const [editingItem, setEditingItem] = useState<EditableExercise | null>(null);
  const [editingExName, setEditingExName] = useState("");

  const program = PROGRAMS.find((p) => p.id === id);
  if (!program) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={[{ color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>{t("errorLoading")}</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtnFallback, { backgroundColor: theme.accent }]}>
          <Text style={[{ color: "#fff", fontFamily: "Outfit_600SemiBold" }]}>{t("back")}</Text>
        </Pressable>
      </View>
    );
  }

  const exercises = program.workouts.map((w) => ({
    ...w,
    exercise: EXERCISES.find((e) => e.id === w.exerciseId),
  })).filter((w) => w.exercise != null);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({ pathname: "/session/[id]", params: { id: program.id } });
  };

  const handleExercisePress = (exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/exercise/[id]", params: { id: exerciseId } });
  };

  const handleEditPress = (item: typeof exercises[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ex = item.exercise!;
    const custom = getCustomization(program.id, ex.id);
    const exT = ex.translations[language as keyof typeof ex.translations] ?? ex.translations.en;
    setEditingExName(exT.name);
    setEditingItem({
      exerciseId: ex.id,
      defaultSets: custom.sets ?? item.sets,
      defaultReps: custom.reps !== undefined ? custom.reps : item.reps,
      defaultWeight: custom.weightKg ?? item.weightKg,
      recommendedWeight: ex.recommendedWeightKg,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        <LinearGradient
          colors={program.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 16 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>

          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={[styles.heroTag, { fontFamily: "Outfit_600SemiBold" }]}>
              {program.type === "home" ? t("homeWorkouts") : t("gymWorkouts")}
            </Text>
            <Text style={[styles.heroTitle, { fontFamily: "Outfit_800ExtraBold" }]}>
              {t(program.nameKey as any)}
            </Text>
            <View style={styles.heroMeta}>
              <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                <Text style={[styles.badgeText, { fontFamily: "Outfit_600SemiBold" }]}>{t(program.difficulty)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                <Ionicons name="time-outline" size={13} color="#fff" />
                <Text style={[styles.badgeText, { fontFamily: "Outfit_600SemiBold" }]}>{program.durationMin} {t("minutes")}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                <Ionicons name="flame-outline" size={13} color="#fff" />
                <Text style={[styles.badgeText, { fontFamily: "Outfit_600SemiBold" }]}>{program.caloriesPerSession} {t("kcal")}</Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.statsRow}>
            {[
              { label: t("weeks"), value: program.totalWeeks, icon: "calendar-outline", color: "#4CAF7D" },
              { label: t("perWeek"), value: `${program.sessionsPerWeek}x`, icon: "repeat-outline", color: "#2196F3" },
              { label: t("exercises"), value: program.workouts.length, icon: "barbell-outline", color: program.gradient[0] },
            ].map((stat, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: theme.card }]}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                <Text style={[styles.statValue, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>{stat.label}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).duration(400)}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
                {t("exerciseList")}
              </Text>
              <Text style={[styles.editHint, { color: theme.textMuted, fontFamily: "Outfit_400Regular" }]}>
                {t("customizeExercise")}
              </Text>
            </View>

            <View style={[styles.exerciseList, { backgroundColor: theme.card }]}>
              {exercises.map((item, index) => {
                const ex = item.exercise!;
                const exT = ex.translations[language as keyof typeof ex.translations] ?? ex.translations.en;
                const custom = getCustomization(program.id, ex.id);
                const isCustomized = Object.keys(custom).length > 0;

                const displaySets = custom.sets ?? item.sets;
                const displayReps = custom.reps !== undefined ? custom.reps : item.reps;
                const displayWeight = custom.weightKg ?? item.weightKg;
                const hasWeight = (ex.recommendedWeightKg ?? 0) > 0 || (item.weightKg ?? 0) > 0;

                return (
                  <View
                    key={ex.id}
                    style={[
                      styles.exerciseRow,
                      {
                        borderBottomColor: theme.border,
                        borderBottomWidth: index < exercises.length - 1 ? StyleSheet.hairlineWidth : 0,
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() => handleExercisePress(ex.id)}
                      style={styles.exerciseRowLeft}
                    >
                      <View style={[styles.exNumber, { backgroundColor: program.gradient[0] + "20" }]}>
                        <Text style={[styles.exNumberText, { color: program.gradient[0], fontFamily: "Outfit_700Bold" }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={[styles.exIconWrap, { backgroundColor: ex.imageColor + "20" }]}>
                        <MaterialCommunityIcons name="dumbbell" size={20} color={ex.imageColor} />
                      </View>
                      <View style={styles.exInfo}>
                        <View style={styles.exNameRow}>
                          <Text style={[styles.exName, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
                            {exT.name}
                          </Text>
                          {isCustomized && (
                            <View style={[styles.customBadge, { backgroundColor: program.gradient[0] + "20" }]}>
                              <Text style={[styles.customBadgeText, { color: program.gradient[0], fontFamily: "Outfit_600SemiBold" }]}>
                                {t("customized")}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.exMetaRow}>
                          <Text style={[styles.exMeta, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                            {displaySets} {t("sets")} · {displayReps}{typeof displayReps === "number" ? ` ${t("reps")}` : ""}
                          </Text>
                          {hasWeight && displayWeight != null && (
                            <View style={[styles.weightBadge, { backgroundColor: theme.border }]}>
                              <Ionicons name="barbell-outline" size={10} color={theme.textSecondary} />
                              <Text style={[styles.weightBadgeText, { color: theme.textSecondary, fontFamily: "Outfit_600SemiBold" }]}>
                                {displayWeight} kg
                              </Text>
                            </View>
                          )}
                        </View>
                        {item.restSeconds > 0 && (
                          <Text style={[styles.restText, { color: theme.textMuted, fontFamily: "Outfit_400Regular" }]}>
                            {t("rest")}: {item.restSeconds}s
                          </Text>
                        )}
                      </View>
                    </Pressable>

                    <Pressable
                      onPress={() => handleEditPress(item)}
                      style={[styles.editBtn, { backgroundColor: theme.border + "80" }]}
                    >
                      <Ionicons name="create-outline" size={16} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      <Animated.View
        entering={FadeInUp.delay(300).duration(400)}
        style={[styles.startBar, {
          backgroundColor: theme.background,
          paddingBottom: insets.bottom + 12,
          borderTopColor: theme.border,
        }]}
      >
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [
            styles.startBtn,
            { backgroundColor: program.gradient[0], opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
          ]}
        >
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={[styles.startBtnText, { fontFamily: "Outfit_700Bold" }]}>{t("startSession")}</Text>
        </Pressable>
      </Animated.View>

      {editingItem && (
        <EditExerciseModal
          visible={editingItem !== null}
          onClose={() => setEditingItem(null)}
          onSave={(data) => {
            updateCustomization(program.id, editingItem.exerciseId, data);
            setEditingItem(null);
          }}
          onReset={() => {
            resetCustomization(program.id, editingItem.exerciseId);
          }}
          item={editingItem}
          exerciseName={editingExName}
          accentColor={program.gradient[0]}
          theme={theme}
          t={t}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { padding: 20, paddingBottom: 28 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  backBtnFallback: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  heroTag: { color: "rgba(255,255,255,0.75)", fontSize: 13, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  heroTitle: { color: "#fff", fontSize: 30, marginBottom: 16 },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { color: "#fff", fontSize: 12 },
  content: { padding: 20 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 6 },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 11, textAlign: "center" },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontSize: 18 },
  editHint: { fontSize: 12 },
  exerciseList: { borderRadius: 16, overflow: "hidden" },
  exerciseRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  exerciseRowLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  exNumber: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  exNumberText: { fontSize: 13 },
  exIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  exInfo: { flex: 1 },
  exNameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  exName: { fontSize: 14 },
  customBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  customBadgeText: { fontSize: 10 },
  exMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  exMeta: { fontSize: 12 },
  weightBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  weightBadgeText: { fontSize: 11 },
  restText: { fontSize: 11, marginTop: 2 },
  editBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  startBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  startBtn: {
    flexDirection: "row", height: 56, borderRadius: 16,
    alignItems: "center", justifyContent: "center", gap: 10,
  },
  startBtnText: { color: "#fff", fontSize: 17 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  editSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  editTitle: { fontSize: 20, textAlign: "center" },
  editRows: { gap: 16 },
  editRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  editRowLabel: { fontSize: 15 },
  recommendedText: { fontSize: 11, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepValue: { fontSize: 18, minWidth: 54, textAlign: "center" },
  editActions: { flexDirection: "row", gap: 12 },
  resetBtn: { flex: 1, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  resetBtnText: { fontSize: 14 },
  saveBtn: { flex: 2, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: "#fff", fontSize: 16 },
});
