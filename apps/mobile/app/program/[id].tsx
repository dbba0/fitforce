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
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { ExerciseCustomization, useWorkout } from "@/contexts/WorkoutContext";
import { PROGRAMS } from "@/data/programs";
import { EXERCISES } from "@/data/exercises";
import { Colors } from "@/constants/colors";
import ExerciseMedia from "@/components/ExerciseMedia";
import { Badge, GhostButton, PrimaryButton, SectionLabel, StatBlock } from "@/components/ui";

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
  suffix = "",
  accentColor,
  theme,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  minValue?: number;
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
      <Text style={[styles.stepValue, { color: theme.text, fontFamily: "Syne_700Bold" }]}>
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

          <Text style={[styles.editTitle, { color: theme.text, fontFamily: "Syne_700Bold" }]} numberOfLines={2}>
            {exerciseName}
          </Text>

          <View style={styles.editRows}>
            <View style={styles.editRow}>
              <Text style={[styles.editRowLabel, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>
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
                <Text style={[styles.editRowLabel, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>
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
                  <Text style={[styles.editRowLabel, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}>
                    {t("weightLabel")}
                  </Text>
                  {item.recommendedWeight != null && (
                    <Text style={[styles.recommendedText, { color: theme.textMuted, fontFamily: "DMSans_400Regular" }]}>
                      Conseillé : {item.recommendedWeight} kg
                    </Text>
                  )}
                </View>
                <Stepper
                  value={weight}
                  onDecrement={() => setWeight(w => Math.max(0, Math.round((w - 2.5) * 10) / 10))}
                  onIncrement={() => setWeight(w => Math.round((w + 2.5) * 10) / 10)}
                  minValue={0}
                  suffix=" kg"
                  accentColor={accentColor}
                  theme={theme}
                />
              </View>
            )}
          </View>

          <View style={styles.editActions}>
            <GhostButton
              label={t("resetToDefault")}
              onPress={() => { onReset(); onClose(); }}
              style={styles.resetBtn}
              textStyle={styles.resetBtnText}
            />
            <PrimaryButton
              label={t("save")}
              onPress={() => { handleSave(); onClose(); }}
              style={[styles.saveBtn, { backgroundColor: accentColor }]}
              textStyle={styles.saveBtnText}
            />
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
        <Text style={[{ color: theme.text, fontFamily: "DMSans_600SemiBold" }]}>{t("errorLoading")}</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtnFallback, { backgroundColor: theme.accent }]}>
          <Text style={[{ color: "#fff", fontFamily: "DMSans_600SemiBold" }]}>{t("back")}</Text>
        </Pressable>
      </View>
    );
  }

  const exercises = program.workouts.map((w) => ({
    ...w,
    exercise: EXERCISES.find((e) => e.id === w.exerciseId),
  })).filter((w) => w.exercise != null);

  const featuredExercise = exercises[0]?.exercise;
  const featuredExerciseTranslation = featuredExercise
    ? featuredExercise.translations[language as keyof typeof featuredExercise.translations] ?? featuredExercise.translations.en
    : null;

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
        <View
          style={[
            styles.hero,
            {
              paddingTop: insets.top + 16,
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>

          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <Text style={[styles.heroTag, { fontFamily: "DMSans_600SemiBold", color: theme.accent }]}>
              {program.type === "home" ? t("homeWorkouts") : t("gymWorkouts")}
            </Text>
            <Text style={[styles.heroTitle, { fontFamily: "Syne_800ExtraBold", color: theme.text }]}>
              {t(program.nameKey as any)}
            </Text>
            <View style={styles.heroMeta}>
              <View style={[styles.badge, { backgroundColor: theme.cardElevated, borderColor: theme.border }]}>
                <Text style={[styles.badgeText, { fontFamily: "DMSans_600SemiBold", color: theme.textSecondary }]}>{t(program.difficulty)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: theme.cardElevated, borderColor: theme.border }]}>
                <Ionicons name="time-outline" size={13} color={theme.textSecondary} />
                <Text style={[styles.badgeText, { fontFamily: "DMSans_600SemiBold", color: theme.textSecondary }]}>{program.durationMin} {t("minutes")}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: theme.cardElevated, borderColor: theme.border }]}>
                <Ionicons name="flame-outline" size={13} color={theme.accent} />
                <Text style={[styles.badgeText, { fontFamily: "DMSans_600SemiBold", color: theme.textSecondary }]}>{program.caloriesPerSession} {t("kcal")}</Text>
              </View>
            </View>

            {featuredExercise && featuredExerciseTranslation ? (
              <View style={[styles.mediaPreview, { borderColor: theme.border, backgroundColor: theme.cardElevated }]}>
                <ExerciseMedia
                  exerciseId={featuredExercise.id}
                  type="auto"
                  size={126}
                  autoPlay={false}
                  loop={false}
                  isActive={false}
                  muscles={featuredExercise.muscles}
                  title={featuredExerciseTranslation.name}
                  subtitle={featuredExerciseTranslation.description}
                  theme={theme}
                  highlightColor={theme.accent}
                />
              </View>
            ) : null}
          </Animated.View>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInDown.delay(160).duration(400)} style={styles.statsRow}>
            {[
              { label: t("weeks"), value: program.totalWeeks, icon: "calendar-outline", color: "#4CAF7D" },
              { label: t("perWeek"), value: `${program.sessionsPerWeek}x`, icon: "repeat-outline", color: "#2196F3" },
              { label: t("exercises"), value: program.workouts.length, icon: "barbell-outline", color: program.gradient[0] },
            ].map((stat, i) => (
              <StatBlock
                key={i}
                value={stat.value}
                label={stat.label}
                iconName={stat.icon as any}
                color={stat.color}
                compact
                style={styles.statCard}
              />
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).duration(400)}>
            <View style={styles.sectionHeaderRow}>
              <SectionLabel style={styles.sectionLabel} textStyle={[styles.sectionTitle, { color: theme.text }]}>
                {t("exerciseList")}
              </SectionLabel>
              <Text style={[styles.editHint, { color: theme.textMuted, fontFamily: "DMSans_400Regular" }]}>
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
                        <Text style={[styles.exNumberText, { color: program.gradient[0], fontFamily: "Syne_700Bold" }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <View style={[styles.exIconWrap, { backgroundColor: ex.imageColor + "20" }]}>
                        <Ionicons name="barbell-outline" size={20} color={ex.imageColor} />
                      </View>
                      <View style={styles.exInfo}>
                        <View style={styles.exNameRow}>
                          <Text style={[styles.exName, { color: theme.text, fontFamily: "DMSans_600SemiBold" }]}>
                            {exT.name}
                          </Text>
                          {isCustomized && (
                            <Badge label={t("customized")} variant="ember" style={styles.customBadge} />
                          )}
                        </View>
                        <View style={styles.exMetaRow}>
                          <Text style={[styles.exMeta, { color: theme.textSecondary, fontFamily: "DMSans_400Regular" }]}>
                            {displaySets} {t("sets")} · {displayReps}{typeof displayReps === "number" ? ` ${t("reps")}` : ""}
                          </Text>
                          {hasWeight && displayWeight != null && (
                            <View style={[styles.weightBadge, { backgroundColor: theme.border }]}>
                              <Ionicons name="barbell-outline" size={10} color={theme.textSecondary} />
                              <Text style={[styles.weightBadgeText, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}>
                                {displayWeight} kg
                              </Text>
                            </View>
                          )}
                        </View>
                        {item.restSeconds > 0 && (
                          <Text style={[styles.restText, { color: theme.textMuted, fontFamily: "DMSans_400Regular" }]}>
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
        <PrimaryButton label={t("startSession")} icon="play" onPress={handleStart} style={styles.startBtn} />
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
  hero: { padding: 20, paddingBottom: 28, borderBottomWidth: 1 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  backBtnFallback: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  heroTag: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 },
  heroTitle: { fontSize: 30, marginBottom: 16 },
  heroMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 12 },
  mediaPreview: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  content: { padding: 20 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: { flex: 1 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionLabel: { flexShrink: 1 },
  sectionTitle: { fontSize: 12, letterSpacing: 0.9 },
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
  customBadge: { marginTop: 1 },
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
  startBtn: { height: 56, borderRadius: 16 },
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
  resetBtn: { flex: 1, height: 48, borderRadius: 14 },
  resetBtnText: { fontSize: 14 },
  saveBtn: { flex: 2, height: 48, borderRadius: 14 },
  saveBtnText: { fontSize: 16 },
});
