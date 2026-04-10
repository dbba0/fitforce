import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { ExerciseCustomization, useWorkout } from "@/contexts/WorkoutContext";
import { PROGRAMS, Program } from "@/data/programs";
import { EXERCISES } from "@/data/exercises";
import { GhostButton, PrimaryButton } from "@/components/ui";
import { Typography } from "@/constants/typography";
import { apiRequest } from "@/lib/query-client";

// ─── Figma design tokens ────────────────────────────────────────────────────
const ACCENT = "#FF6B35";
const BG = "#0A0A0F";
const CARD_BG = "#1A1A1A";
const CARD_BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#FFFFFF";
const MUTED = "rgba(255,255,255,0.5)";
const BADGE_BG = "rgba(255,107,53,0.2)";
const BADGE_BORDER = "rgba(255,107,53,0.4)";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getXpReward(calories: number): number {
  return Math.round((calories * 1.2) / 50) * 50;
}

function getCategoryLabels(program: Program): string[] {
  const map: Record<string, string> = {
    fullBody: "full body",
    hiit: "hiit",
    abs: "core",
    push: "push",
    pull: "pull",
    legs: "legs",
    upper: "upper",
    lower: "lower",
    chest: "chest",
    back: "back",
    strength: "strength",
    hypertrophy: "hypertrophy",
    cardio: "cardio",
  };
  const cat = map[program.category] ?? program.category;
  const tags = [cat];
  if (program.isCardio && !tags.includes("cardio")) tags.push("cardio");
  return tags;
}

function getSessionGoals(program: Program): string[] {
  if (program.difficulty === "beginner") {
    return [
      "Build strength with progressive overload",
      "Focus on proper form and control",
      "Maintain consistent rest periods",
    ];
  }
  if (program.difficulty === "advanced") {
    return [
      "Maximize muscle recruitment and power output",
      "Train to failure on key sets",
      "Elite performance through discipline",
    ];
  }
  return [
    "Increase intensity with compound movements",
    "Push past plateaus with heavier loads",
    "Minimize rest time for metabolic benefit",
  ];
}

function formatReps(reps: number | string, sets: number): string {
  if (typeof reps === "string") return `${sets} × ${reps}`;
  return `${sets} × ${reps} reps`;
}

async function getThumb(name: string): Promise<string | null> {
  const slug = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  try {
    const r = await apiRequest("GET", `/api/exercises/${slug}`);
    const d = await r.json();
    return d.thumbnailUrl ?? null;
  } catch {
    return null;
  }
}

// ─── ExerciseThumbnail ────────────────────────────────────────────────────────

function ExerciseThumbnail({ name }: { name: string }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    getThumb(name).then(setThumbUrl);
  }, [name]);

  if (thumbUrl) {
    return <Image source={{ uri: thumbUrl }} style={styles.thumbImg} resizeMode="cover" />;
  }
  return (
    <View style={styles.thumbFallback}>
      <Ionicons name="barbell-outline" size={22} color={MUTED} />
    </View>
  );
}

// ─── Stepper (unchanged) ──────────────────────────────────────────────────────

function Stepper({
  value,
  onDecrement,
  onIncrement,
  minValue = 1,
  suffix = "",
  accentColor,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  minValue?: number;
  suffix?: string;
  accentColor: string;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => { if (value > minValue) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDecrement(); } }}
        style={[styles.stepBtn, { backgroundColor: value <= minValue ? CARD_BORDER : accentColor + "20" }]}
      >
        <Ionicons name="remove" size={18} color={value <= minValue ? MUTED : accentColor} />
      </Pressable>
      <Text style={[styles.stepValue, { fontFamily: Typography.titleStrong }]}>{value}{suffix}</Text>
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onIncrement(); }}
        style={[styles.stepBtn, { backgroundColor: accentColor + "20" }]}
      >
        <Ionicons name="add" size={18} color={accentColor} />
      </Pressable>
    </View>
  );
}

// ─── EditExerciseModal (unchanged logic, updated colors) ─────────────────────

function EditExerciseModal({
  visible,
  onClose,
  onSave,
  onReset,
  item,
  exerciseName,
  accentColor,
  t,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ExerciseCustomization) => void;
  onReset: () => void;
  item: EditableExercise;
  exerciseName: string;
  accentColor: string;
  t: (key: any) => string;
}) {
  const [sets, setSets] = useState(item.defaultSets);
  const [reps, setReps] = useState(typeof item.defaultReps === "number" ? item.defaultReps : 0);
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
        <Pressable style={styles.editSheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={[styles.editTitle, { fontFamily: Typography.titleStrong }]} numberOfLines={2}>
            {exerciseName}
          </Text>
          <View style={styles.editRows}>
            <View style={styles.editRow}>
              <Text style={[styles.editRowLabel, { fontFamily: Typography.bodySemiBold }]}>{t("sets")}</Text>
              <Stepper value={sets} onDecrement={() => setSets(s => Math.max(1, s - 1))} onIncrement={() => setSets(s => s + 1)} minValue={1} accentColor={accentColor} />
            </View>
            {!isTimedRep && (
              <View style={styles.editRow}>
                <Text style={[styles.editRowLabel, { fontFamily: Typography.bodySemiBold }]}>{t("reps")}</Text>
                <Stepper value={reps} onDecrement={() => setReps(r => Math.max(1, r - 1))} onIncrement={() => setReps(r => r + 1)} minValue={1} accentColor={accentColor} />
              </View>
            )}
            {hasWeight && (
              <View style={styles.editRow}>
                <View>
                  <Text style={[styles.editRowLabel, { fontFamily: Typography.bodySemiBold }]}>{t("weightLabel")}</Text>
                  {item.recommendedWeight != null && (
                    <Text style={[styles.recommendedText, { fontFamily: Typography.body }]}>
                      Conseillé : {item.recommendedWeight} kg
                    </Text>
                  )}
                </View>
                <Stepper value={weight} onDecrement={() => setWeight(w => Math.max(0, Math.round((w - 2.5) * 10) / 10))} onIncrement={() => setWeight(w => Math.round((w + 2.5) * 10) / 10)} minValue={0} suffix=" kg" accentColor={accentColor} />
              </View>
            )}
          </View>
          <View style={styles.editActions}>
            <GhostButton label={t("resetToDefault")} onPress={() => { onReset(); onClose(); }} style={styles.resetBtn} textStyle={styles.resetBtnText} />
            <PrimaryButton label={t("save")} onPress={() => { handleSave(); onClose(); }} style={[styles.saveBtn, { backgroundColor: accentColor }]} textStyle={styles.saveBtnText} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type EditableExercise = {
  exerciseId: string;
  defaultSets: number;
  defaultReps: number | string;
  defaultWeight?: number;
  recommendedWeight?: number;
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { getCustomization, updateCustomization, resetCustomization } = useWorkout();

  const [editingItem, setEditingItem] = useState<EditableExercise | null>(null);
  const [editingExName, setEditingExName] = useState("");

  const program = PROGRAMS.find((p) => p.id === id);

  if (!program) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={[styles.errorText, { fontFamily: Typography.bodySemiBold }]}>{t("errorLoading")}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtnFallback}>
          <Text style={{ color: "#fff", fontFamily: Typography.bodySemiBold }}>{t("back")}</Text>
        </Pressable>
      </View>
    );
  }

  const exercises = program.workouts
    .map((w) => ({ ...w, exercise: EXERCISES.find((e) => e.id === w.exerciseId) }))
    .filter((w) => w.exercise != null);

  const xp = getXpReward(program.caloriesPerSession);
  const categories = getCategoryLabels(program);
  const goals = getSessionGoals(program);

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
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Header image area ── */}
        <View style={[styles.headerArea, { backgroundColor: program.gradient[0] }]}>
          {/* Gradient overlay */}
          <View style={styles.headerOverlayTop} />
          <View style={styles.headerOverlayBottom} />

          {/* Back button */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
            style={[styles.backBtn, { marginTop: insets.top + 8 }]}
          >
            <Ionicons name="arrow-back" size={20} color={TEXT} />
          </Pressable>

          {/* Content */}
          <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.headerContent}>
            {/* Badges: difficulty + categories */}
            <View style={styles.headerBadges}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{program.difficulty.toUpperCase()}</Text>
              </View>
              {categories.map((cat) => (
                <View key={cat} style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{cat}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.headerTitle} numberOfLines={2}>
              {t(program.nameKey as any)}
            </Text>
            <Text style={styles.headerDesc} numberOfLines={2}>
              {getCategoryDescription(program)}
            </Text>
          </Animated.View>
        </View>

        <View style={styles.content}>

          {/* ── Stats 3 columns ── */}
          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.statsCard}>
            <StatCol icon="time-outline" value={program.durationMin} label="MINUTES" />
            <View style={styles.statDivider} />
            <StatCol icon="flame-outline" value={program.caloriesPerSession} label="CALORIES" />
            <View style={styles.statDivider} />
            <StatCol icon="trending-up-outline" value={`+${xp}`} label="XP" />
          </Animated.View>

          {/* ── Session Goals ── */}
          <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.goalsCard}>
            <Text style={styles.goalsTitle}>🎯 Session Goals</Text>
            {goals.map((goal) => (
              <View key={goal} style={styles.goalRow}>
                <View style={styles.goalBullet} />
                <Text style={styles.goalText}>{goal}</Text>
              </View>
            ))}
          </Animated.View>

          {/* ── Exercise list ── */}
          <Animated.View entering={FadeInDown.delay(240).duration(400)}>
            <View style={styles.exercisesHeader}>
              <Text style={styles.exercisesTitle}>Exercises ({exercises.length})</Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/exercises" as any);
                }}
              >
                <Text style={styles.previewAll}>Preview all</Text>
              </Pressable>
            </View>

            <View style={styles.exerciseList}>
              {exercises.map((item, index) => {
                const ex = item.exercise!;
                const exT = ex.translations[language as keyof typeof ex.translations] ?? ex.translations.en;
                const custom = getCustomization(program.id, ex.id);
                const displaySets = custom.sets ?? item.sets;
                const displayReps = custom.reps !== undefined ? custom.reps : item.reps;

                return (
                  <Pressable
                    key={ex.id}
                    onPress={() => handleExercisePress(ex.id)}
                    onLongPress={() => handleEditPress(item)}
                    style={({ pressed }) => [styles.exerciseCard, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    {/* Number */}
                    <Text style={styles.exNum}>
                      {String(index + 1).padStart(2, "0")}
                    </Text>

                    {/* Thumbnail */}
                    <ExerciseThumbnail name={exT.name} />

                    {/* Info */}
                    <View style={styles.exInfo}>
                      <Text style={styles.exName} numberOfLines={1}>{exT.name}</Text>
                      <Text style={styles.exMeta}>
                        {formatReps(displayReps, displaySets)}
                        {item.restSeconds > 0 ? ` · ${item.restSeconds}s rest` : ""}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={16} color={MUTED} />
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* ── CTA Start Workout ── */}
      <Animated.View
        entering={FadeInUp.delay(300).duration(400)}
        style={[styles.startBar, { paddingBottom: insets.bottom + 12 }]}
      >
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => [styles.startBtn, { opacity: pressed ? 0.9 : 1 }]}
        >
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.startBtnLabel}>Start Workout</Text>
        </Pressable>
      </Animated.View>

      {/* ── Edit modal (unchanged logic) ── */}
      {editingItem && (
        <EditExerciseModal
          visible={editingItem !== null}
          onClose={() => setEditingItem(null)}
          onSave={(data) => { updateCustomization(program.id, editingItem.exerciseId, data); setEditingItem(null); }}
          onReset={() => { resetCustomization(program.id, editingItem.exerciseId); }}
          item={editingItem}
          exerciseName={editingExName}
          accentColor={program.gradient[0]}
          t={t}
        />
      )}
    </View>
  );
}

// ─── StatCol sub-component ────────────────────────────────────────────────────

function StatCol({
  icon,
  value,
  label,
}: {
  icon: string;
  value: number | string;
  label: string;
}) {
  return (
    <View style={styles.statCol}>
      <Ionicons name={icon as any} size={20} color={ACCENT} style={{ marginBottom: 4 }} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Category description ─────────────────────────────────────────────────────

function getCategoryDescription(program: Program): string {
  const map: Record<string, string> = {
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
  return map[program.category] ?? "Build strength and endurance";
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  errorText: { color: TEXT, fontSize: 16 },
  backBtnFallback: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: ACCENT },

  // Header
  headerArea: { height: 220, position: "relative", justifyContent: "flex-end" },
  headerOverlayTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,10,15,0.2)",
  },
  headerOverlayBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    backgroundColor: "rgba(10,10,15,0.78)",
  },
  backBtn: {
    position: "absolute",
    top: 0,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  headerContent: {
    padding: 16,
    paddingBottom: 18,
    zIndex: 1,
  },
  headerBadges: { flexDirection: "row", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  badge: {
    backgroundColor: BADGE_BG,
    borderWidth: 1,
    borderColor: BADGE_BORDER,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: ACCENT,
    letterSpacing: 0.8,
    fontFamily: Typography.labelTech,
  },
  catBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: TEXT,
    letterSpacing: 0.4,
    fontFamily: Typography.labelTech,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT,
    lineHeight: 26,
    marginBottom: 4,
    fontFamily: Typography.titleStrong,
  },
  headerDesc: {
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
    fontFamily: Typography.body,
  },

  // Content
  content: { padding: 16, gap: 16 },

  // Stats card
  statsCard: {
    flexDirection: "row",
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 20,
    paddingHorizontal: 8,
  },
  statCol: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT,
    fontFamily: Typography.titleStrong,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: MUTED,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: Typography.labelTech,
  },
  statDivider: {
    width: 1,
    backgroundColor: CARD_BORDER,
    marginVertical: 4,
  },

  // Goals card
  goalsCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 16,
    gap: 10,
  },
  goalsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: TEXT,
    fontFamily: Typography.bodySemiBold,
    marginBottom: 2,
  },
  goalRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  goalBullet: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: ACCENT,
    marginTop: 5,
    flexShrink: 0,
  },
  goalText: {
    flex: 1,
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
    fontFamily: Typography.body,
  },

  // Exercise list
  exercisesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  exercisesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    fontFamily: Typography.titleStrong,
  },
  previewAll: {
    fontSize: 14,
    color: ACCENT,
    fontFamily: Typography.bodySemiBold,
  },
  exerciseList: { gap: 10 },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    padding: 12,
  },
  exNum: {
    fontSize: 14,
    fontWeight: "600",
    color: MUTED,
    fontFamily: Typography.bodySemiBold,
    width: 24,
  },
  thumbImg: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#2A2A2A",
  },
  thumbFallback: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  exInfo: { flex: 1 },
  exName: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT,
    fontFamily: Typography.bodySemiBold,
    marginBottom: 3,
  },
  exMeta: {
    fontSize: 12,
    color: MUTED,
    fontFamily: Typography.body,
  },

  // CTA
  startBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "rgba(10,10,15,0.95)",
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
  },
  startBtn: {
    height: 56,
    borderRadius: 16,
    backgroundColor: ACCENT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  startBtnLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    fontFamily: Typography.bodySemiBold,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  editSheet: {
    backgroundColor: CARD_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 20,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: CARD_BORDER, alignSelf: "center", marginBottom: 4 },
  editTitle: { fontSize: 20, textAlign: "center", color: TEXT },
  editRows: { gap: 16 },
  editRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  editRowLabel: { fontSize: 15, color: MUTED },
  recommendedText: { fontSize: 11, color: MUTED, marginTop: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepValue: { fontSize: 18, minWidth: 54, textAlign: "center", color: TEXT },
  editActions: { flexDirection: "row", gap: 12 },
  resetBtn: { flex: 1, height: 48, borderRadius: 14 },
  resetBtnText: { fontSize: 14 },
  saveBtn: { flex: 2, height: 48, borderRadius: 14 },
  saveBtnText: { fontSize: 16 },
});
