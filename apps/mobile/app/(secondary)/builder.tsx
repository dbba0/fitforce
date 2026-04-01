import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { EXERCISES, MuscleGroup } from "@/data/exercises";
import { fetchExercisesFromApi, RemoteExercise } from "@/services";
import {
  BottomSheet,
  Card,
  CardInput,
  GhostButton,
  IconButton,
  PillTabs,
  PrimaryButton,
} from "@/components/ui";
import {
  createEmptyProgram,
  createId,
  CustomExerciseItem,
  CustomProgram,
  CustomProgramMode,
} from "@/utils/customProgramStorage";
import { TranslationKey } from "@/lib/i18n";

type UnitSystem = "kg" | "lbs";
type MuscleFilter = "all" | MuscleGroup;
type Step = 1 | 2 | 3 | 4;

type Objective = "massMuscle" | "weightLoss" | "endurance" | "recomposition";

type EditableExerciseState = {
  dayId: string;
  exerciseId: string;
  sets: string;
  reps: string;
  restSeconds: string;
  weight: string;
} | null;

type CatalogExercise = {
  id: string;
  name: string;
  muscles: MuscleGroup[];
  equipment: string;
  isCardio?: boolean;
  target?: string;
  bodyPart?: string;
  gifUrl?: string;
};

const UNIT_KEY = "@fitforce_builder_units";
const LBS_PER_KG = 2.20462;
const STEPS: Step[] = [1, 2, 3, 4];

const OBJECTIVE_PRESETS: Record<
  Objective,
  { sets: number; reps: string; restSeconds: number; weightFactor: number }
> = {
  massMuscle: { sets: 4, reps: "8-12", restSeconds: 75, weightFactor: 0.55 },
  recomposition: { sets: 4, reps: "10-12", restSeconds: 60, weightFactor: 0.45 },
  weightLoss: { sets: 3, reps: "12-15", restSeconds: 45, weightFactor: 0.35 },
  endurance: { sets: 3, reps: "15-20", restSeconds: 30, weightFactor: 0.3 },
};

const LEVEL_MULTIPLIER: Record<string, number> = {
  beginner: 0.85,
  intermediate: 1,
  advanced: 1.15,
};

function formatTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template
  );
}

function getExerciseName(exerciseId: string, language: string): string {
  const exercise = EXERCISES.find((item) => item.id === exerciseId);
  if (!exercise) return exerciseId;
  const tr = exercise.translations[language as keyof typeof exercise.translations] ?? exercise.translations.en;
  return tr.name;
}

function mapTextToMuscleGroup(value: string): MuscleGroup[] {
  const text = value.toLowerCase();
  const groups = new Set<MuscleGroup>();

  if (/(chest|pectoral)/.test(text)) groups.add("chest");
  if (/(back|lat|trap|spine)/.test(text)) groups.add("back");
  if (/(shoulder|delt)/.test(text)) groups.add("shoulders");
  if (/(arm|biceps|triceps|forearm)/.test(text)) groups.add("arms");
  if (/(leg|quad|hamstring|glute|calf)/.test(text)) groups.add("legs");
  if (/(core|abs|waist)/.test(text)) groups.add("core");

  if (!groups.size) groups.add("core");
  return Array.from(groups);
}

function toCatalogExercise(item: RemoteExercise): CatalogExercise {
  const source = `${item.target} ${item.bodyPart} ${item.name}`;
  const muscles = mapTextToMuscleGroup(source);
  const isCardio = /(cardio|conditioning|plyometric)/i.test(source);

  return {
    id: item.id,
    name: item.name,
    muscles,
    equipment: "bodyweight",
    isCardio,
    target: item.target,
    bodyPart: item.bodyPart,
    gifUrl: item.gifUrl,
  };
}

function shouldSuggestWeight(equipment: string): boolean {
  return ["dumbbell", "barbell", "machine", "kettlebell"].includes(equipment);
}

function roundToStep(value: number, step: number): number {
  if (!value || !Number.isFinite(value)) return 0;
  return Math.round(value / step) * step;
}

function formatWeightForUnit(weightKg: number | undefined, unit: UnitSystem): string {
  const value = Number(weightKg || 0);
  if (!value) return "";
  return unit === "kg" ? String(Math.round(value)) : String(Math.round(value * LBS_PER_KG));
}

function parseWeightInput(input: string, unit: UnitSystem): number {
  const n = Number(input || 0);
  if (!n) return 0;
  return unit === "kg" ? n : Number((n / LBS_PER_KG).toFixed(2));
}

function getMuscleLabelKey(muscle: MuscleGroup): TranslationKey {
  if (muscle === "back") return "backMuscle";
  return muscle as TranslationKey;
}

function getNextStep(step: Step): Step {
  if (step === 1) return 2;
  if (step === 2) return 3;
  if (step === 3) return 4;
  return 4;
}

function getPrevStep(step: Step): Step {
  if (step === 4) return 3;
  if (step === 3) return 2;
  if (step === 2) return 1;
  return 1;
}

function StepIndicator({
  step,
  theme,
}: {
  step: Step;
  theme: typeof Colors.dark | typeof Colors.light;
}) {
  return (
    <View style={styles.stepRow}>
      {STEPS.map((item, index) => {
        const done = item < step;
        const current = item === step;

        return (
          <React.Fragment key={`step-${item}`}>
            <View
              style={[
                styles.stepCircle,
                {
                  backgroundColor: done ? theme.accent : theme.cardElevated,
                  borderColor: current || done ? theme.accent : theme.border,
                },
              ]}
            >
              {done ? (
                <Ionicons name="checkmark" size={15} color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.stepCircleText,
                    {
                      color: current ? theme.accent : theme.textMuted,
                      fontFamily: "Syne_700Bold",
                    },
                  ]}
                >
                  {item}
                </Text>
              )}
            </View>

            {index < STEPS.length - 1 ? (
              <View
                style={[
                  styles.stepLine,
                  {
                    backgroundColor: item < step ? `${theme.accent}88` : theme.border,
                  },
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function SelectPill({
  label,
  active,
  onPress,
  compact = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectPill,
        compact ? styles.selectPillCompact : null,
        {
          backgroundColor: active ? `${theme.accent}20` : theme.cardElevated,
          borderColor: active ? `${theme.accent}88` : theme.border,
          opacity: pressed ? 0.84 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.selectPillText,
          {
            color: active ? theme.accent : theme.textSecondary,
            fontFamily: active ? "Syne_700Bold" : "DMSans_600SemiBold",
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function BuilderScreen() {
  const { t, language } = useLanguage();
  const { profile, customPrograms, refreshCustomPrograms, persistCustomPrograms } = useWorkout();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<CustomProgramMode>("gym");
  const [objective, setObjective] = useState<Objective>(
    ((profile?.objective as Objective) || "recomposition") as Objective
  );
  const [programs, setPrograms] = useState<CustomProgram[]>([]);
  const [draft, setDraft] = useState<CustomProgram>(createEmptyProgram("gym"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("kg");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [apiCatalog, setApiCatalog] = useState<CatalogExercise[]>([]);

  const [activeDayId, setActiveDayId] = useState<string>(draft.days[0]?.id || "");
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>("all");

  const [editingExercise, setEditingExercise] = useState<EditableExerciseState>(null);

  useEffect(() => {
    setPrograms(customPrograms);
  }, [customPrograms]);

  useEffect(() => {
    AsyncStorage.getItem(UNIT_KEY)
      .then((saved) => {
        if (saved === "kg" || saved === "lbs") setUnitSystem(saved);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!draft.days.length) return;
    if (!draft.days.find((item) => item.id === activeDayId)) {
      setActiveDayId(draft.days[0].id);
    }
  }, [draft.days, activeDayId]);

  useEffect(() => {
    let mounted = true;

    fetchExercisesFromApi()
      .then((items) => {
        if (!mounted || items.length === 0) return;
        setApiCatalog(items.map(toCatalogExercise));
      })
      .catch((error) => {
        console.error("[Builder] Failed to load exercises from API", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const staticCatalog = useMemo<CatalogExercise[]>(() => {
    return EXERCISES.map((exercise) => {
      const translation =
        exercise.translations[language as keyof typeof exercise.translations] ?? exercise.translations.en;
      return {
        id: exercise.id,
        name: translation.name,
        muscles: exercise.muscles,
        equipment: exercise.equipment,
        isCardio: exercise.isCardio,
        gifUrl: exercise.gifUrl,
      };
    });
  }, [language]);

  const exerciseCatalog = useMemo<CatalogExercise[]>(
    () => (apiCatalog.length > 0 ? apiCatalog : staticCatalog),
    [apiCatalog, staticCatalog]
  );

  const exerciseCatalogById = useMemo(() => {
    return new Map(exerciseCatalog.map((exercise) => [exercise.id, exercise]));
  }, [exerciseCatalog]);

  const activeDay = useMemo(
    () => draft.days.find((item) => item.id === activeDayId) ?? draft.days[0],
    [draft.days, activeDayId]
  );

  const summary = useMemo(() => {
    const totalExercises = draft.days.reduce((acc, day) => acc + day.exercises.length, 0);
    const totalSets = draft.days.reduce(
      (acc, day) => acc + day.exercises.reduce((sum, exercise) => sum + (Number(exercise.sets) || 0), 0),
      0
    );
    return { totalExercises, totalSets };
  }, [draft.days]);

  const addedExerciseIds = useMemo(
    () => new Set((activeDay?.exercises || []).map((item) => item.exerciseId)),
    [activeDay?.exercises]
  );

  const libraryExercises = useMemo(() => {
    const byMode = exerciseCatalog.filter((exercise) =>
      mode === "cardio" ? !!exercise.isCardio : !exercise.isCardio
    );

    const byMuscle =
      muscleFilter === "all"
        ? byMode
        : byMode.filter((exercise) => exercise.muscles.includes(muscleFilter));

    const q = exerciseQuery.trim().toLowerCase();
    const byQuery = !q
      ? byMuscle
      : byMuscle.filter((exercise) => {
          const name = exercise.name.toLowerCase();
          return name.includes(q) || exercise.muscles.join(" ").includes(q);
        });

    return byQuery
      .filter((exercise) => !addedExerciseIds.has(exercise.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mode, muscleFilter, exerciseQuery, addedExerciseIds, exerciseCatalog]);

  const addedExercises = useMemo(() => {
    const dayExercises = activeDay?.exercises || [];
    return dayExercises
      .map((exercise) => ({
        ...exercise,
        name:
          exerciseCatalogById.get(exercise.exerciseId)?.name ??
          getExerciseName(exercise.exerciseId, language),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [activeDay?.exercises, exerciseCatalogById, language]);

  const modeTabs: { key: CustomProgramMode; label: string }[] = [
    { key: "home", label: t("builderTypeHome") },
    { key: "gym", label: t("builderTypeGym") },
    { key: "cardio", label: t("builderTypeCardio") },
  ];

  const levelTabs: { key: CustomProgram["difficulty"]; label: string }[] = [
    { key: "beginner", label: t("beginner") },
    { key: "intermediate", label: t("intermediate") },
    { key: "advanced", label: t("advanced") },
  ];

  const objectiveTabs: { key: Objective; label: string }[] = [
    { key: "massMuscle", label: t("massMuscle") },
    { key: "weightLoss", label: t("weightLoss") },
    { key: "endurance", label: t("endurance") },
    { key: "recomposition", label: t("recomposition") },
  ];

  const dayTabs = draft.days.map((day, index) => ({
    key: day.id,
    label: formatTemplate(t("builderDayLabelPattern"), { index: index + 1 }),
  }));

  const stepTitleMap: Record<Step, TranslationKey> = {
    1: "builderStep1Basics",
    2: "builderStep2Structure",
    3: "builderStep3Exercises",
    4: "builderStep4Review",
  };

  const screenTitle =
    step === 1 && !editingId
      ? t("builderNewProgramTitle")
      : draft.title.trim() || t("builderNewProgramTitle");

  const stepCtaLabel =
    step === 3
      ? t("builderContinueReviewCta")
      : step === 4
      ? editingId
        ? t("builderUpdateProgram")
        : t("builderSaveProgram")
      : t("builderContinueCta");

  const muscleTabs =
    mode === "cardio"
      ? (["all", "legs", "core"] as MuscleFilter[])
      : (["all", "chest", "shoulders", "arms", "back", "legs", "core"] as MuscleFilter[]);

  const toggleUnitSystem = async (next: UnitSystem) => {
    setUnitSystem(next);
    await AsyncStorage.setItem(UNIT_KEY, next);
  };

  const addDay = () => {
    setDraft((prev) => {
      const nextDay = {
        id: createId("day"),
        label: formatTemplate(t("builderDayLabelPattern"), { index: prev.days.length + 1 }),
        focus: mode === "cardio" ? t("builderCardioFocusDefault") : t("builderMuscleFocusDefault"),
        exercises: [],
      };
      return { ...prev, days: [...prev.days, nextDay] };
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeDay = (dayId: string) => {
    setDraft((prev) => {
      if (prev.days.length <= 1) return prev;
      return { ...prev, days: prev.days.filter((day) => day.id !== dayId) };
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateDay = (dayId: string, patch: Partial<CustomProgram["days"][number]>) => {
    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
    }));
  };

  const addExerciseToActiveDay = (exerciseId: string) => {
    if (!activeDay) return;

    const exercise = exerciseCatalogById.get(exerciseId);
    const preset = OBJECTIVE_PRESETS[objective] || OBJECTIVE_PRESETS.recomposition;
    const level = draft.difficulty || profile?.level || "beginner";
    const levelMult = LEVEL_MULTIPLIER[level] ?? 1;
    const baseWeight = profile?.weight && profile.weight > 0 ? profile.weight : 70;

    const weightCandidate = shouldSuggestWeight(exercise?.equipment || "")
      ? roundToStep(baseWeight * preset.weightFactor * levelMult, 2.5)
      : 0;

    const nextExercise: CustomExerciseItem = {
      id: createId("ex"),
      exerciseId,
      sets: mode === "cardio" ? 1 : preset.sets,
      reps: mode === "cardio" ? "30-60s" : preset.reps,
      restSeconds: mode === "cardio" ? 30 : preset.restSeconds,
      weightKg: mode === "gym" && weightCandidate > 0 ? weightCandidate : undefined,
    };

    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.id === activeDay.id
          ? { ...day, exercises: [...day.exercises, nextExercise] }
          : day
      ),
    }));

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeExercise = (dayId: string, exId: string) => {
    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.id === dayId
          ? { ...day, exercises: day.exercises.filter((exercise) => exercise.id !== exId) }
          : day
      ),
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openExerciseEdit = (dayId: string, exId: string) => {
    const day = draft.days.find((item) => item.id === dayId);
    const ex = day?.exercises.find((item) => item.id === exId);
    if (!ex) return;

    setEditingExercise({
      dayId,
      exerciseId: exId,
      sets: String(ex.sets || 1),
      reps: String(ex.reps || ""),
      restSeconds: String(ex.restSeconds || 0),
      weight: formatWeightForUnit(ex.weightKg, unitSystem),
    });
  };

  const applyExerciseEdit = () => {
    if (!editingExercise) return;

    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.id === editingExercise.dayId
          ? {
              ...day,
              exercises: day.exercises.map((exercise) =>
                exercise.id === editingExercise.exerciseId
                  ? {
                      ...exercise,
                      sets: Math.max(1, Number(editingExercise.sets || 1)),
                      reps: editingExercise.reps || "",
                      restSeconds: Math.max(0, Number(editingExercise.restSeconds || 0)),
                      weightKg: parseWeightInput(editingExercise.weight || "", unitSystem) || undefined,
                    }
                  : exercise
              ),
            }
          : day
      ),
    }));

    setEditingExercise(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const resetDraft = () => {
    const fresh = createEmptyProgram(mode);
    setDraft(fresh);
    setEditingId(null);
    setStep(1);
    setActiveDayId(fresh.days[0]?.id || "");
    setExerciseQuery("");
    setMuscleFilter("all");
  };

  const saveDraftProgram = async () => {
    setSaveError(null);

    if (!draft.title.trim()) {
      Alert.alert(t("builder"), t("builderAlertAddProgramName"));
      return;
    }

    if (summary.totalExercises === 0) {
      Alert.alert(t("builder"), t("builderAlertAddExercise"));
      return;
    }

    const now = new Date().toISOString();
    const next: CustomProgram = {
      ...draft,
      mode,
      updatedAt: now,
      days: draft.days.map((day) => ({
        ...day,
        exercises: day.exercises,
      })),
    };

    const programData: CustomProgram = editingId
      ? next
      : { ...next, id: createId("cp"), createdAt: now };

    console.log("[Builder] Saving program:", JSON.stringify(programData));

    const updated = editingId
      ? programs.map((item) => (item.id === editingId ? programData : item))
      : [programData, ...programs];

    try {
      await persistCustomPrograms(updated, {
        addedProgramId: editingId ? undefined : programData.id,
        reason: editingId ? "update" : "create",
      });
      const refreshed = await refreshCustomPrograms();
      const result = refreshed.length > 0 ? refreshed : updated;
      console.log("[Builder] Save result:", result);
      setPrograms(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("builder"), editingId ? t("builderAlertUpdated") : t("builderAlertSaved"));
      resetDraft();
    } catch (error) {
      console.error("[Builder] Save error:", error);
      console.error("[Builder] Failed to save custom program", {
        error,
        editingId,
        draftTitle: draft.title,
        mode,
      });
      setSaveError(t("builderSaveErrorInline"));
    }
  };

  const editProgram = (program: CustomProgram) => {
    const clone = JSON.parse(JSON.stringify(program)) as CustomProgram;
    setDraft(clone);
    setEditingId(program.id);
    setMode(program.mode);
    setStep(1);
    setActiveDayId(clone.days[0]?.id || "");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const duplicateProgram = async (program: CustomProgram) => {
    const copy: CustomProgram = {
      ...JSON.parse(JSON.stringify(program)),
      id: createId("cp"),
      title: `${program.title} ${t("builderCopySuffix")}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [copy, ...programs];
    await persistCustomPrograms(updated, {
      addedProgramId: copy.id,
      reason: "duplicate",
    });
    const refreshed = await refreshCustomPrograms();
    setPrograms(refreshed.length > 0 ? refreshed : updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const deleteProgram = async (id: string) => {
    const updated = programs.filter((item) => item.id !== id);
    await persistCustomPrograms(updated, { reason: "delete" });
    const refreshed = await refreshCustomPrograms();
    setPrograms(refreshed.length > 0 ? refreshed : updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onMainCtaPress = () => {
    if (step === 4) {
      saveDraftProgram();
      return;
    }

    setStep(getNextStep(step));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onBackPress = () => {
    if (step > 1) {
      setStep(getPrevStep(step));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }

    router.back();
  };

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const webBottomPadding = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}> 
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 8,
          paddingBottom: Platform.OS === "web" ? webBottomPadding + 118 : insets.bottom + 118,
        }}
      >
        <View style={styles.headerWrap}>
          <View style={styles.headerRow}>
            <IconButton icon="chevron-back" onPress={onBackPress} size={50} />
            <Text
              style={[styles.headerTitle, { color: theme.text, fontFamily: "Syne_800ExtraBold" }]}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {screenTitle}
            </Text>
          </View>

          <StepIndicator step={step} theme={theme} />

          <Text style={[styles.stepLabel, { color: theme.accent, fontFamily: "Syne_700Bold" }]}> 
            {formatTemplate(t("builderStepLabelPattern"), {
              step,
              label: t(stepTitleMap[step]),
            }).toUpperCase()}
          </Text>
        </View>

        <View style={styles.contentWrap}>
          {step === 1 ? (
            <>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}> 
                {t("builderProgramNameLabel")}
              </Text>
              <CardInput
                placeholder={t("builderProgramNamePlaceholder")}
                value={draft.title}
                onChangeText={(value) => setDraft((prev) => ({ ...prev, title: value }))}
                containerStyle={[styles.inputSpacing, { borderColor: `${theme.accent}88` }]}
              />

              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}> 
                {t("builderTypeLabel")}
              </Text>
              <View style={styles.threeColWrap}>
                {modeTabs.map((tab) => (
                  <SelectPill
                    key={tab.key}
                    label={tab.label}
                    active={mode === tab.key}
                    onPress={() => {
                      setMode(tab.key);
                      setDraft((prev) => ({ ...prev, mode: tab.key }));
                    }}
                    compact
                  />
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}> 
                {t("builderGoalLabel")}
              </Text>
              <View style={styles.goalGrid}>
                {objectiveTabs.map((tab) => (
                  <SelectPill
                    key={tab.key}
                    label={tab.label}
                    active={objective === tab.key}
                    onPress={() => setObjective(tab.key)}
                  />
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}> 
                {t("builderLevelLabel")}
              </Text>
              <View style={styles.threeColWrap}>
                {levelTabs.map((tab) => (
                  <SelectPill
                    key={tab.key}
                    label={tab.label}
                    active={draft.difficulty === tab.key}
                    onPress={() => setDraft((prev) => ({ ...prev, difficulty: tab.key }))}
                    compact
                  />
                ))}
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.textMuted, fontFamily: "Syne_700Bold" }]}> 
                  {t("builderStep2Structure").toUpperCase()}
                </Text>
              </View>

              <View style={styles.twoColumns}>
                <View style={styles.columnItem}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}> 
                    {t("builderDaysPerWeekLabel")}
                  </Text>
                  <CardInput
                    placeholder={t("builderPlaceholderExample4")}
                    keyboardType="number-pad"
                    value={String(draft.daysPerWeek)}
                    onChangeText={(value) =>
                      setDraft((prev) => ({ ...prev, daysPerWeek: Math.max(1, Number(value || 1)) }))
                    }
                  />
                </View>

                <View style={styles.columnItem}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}> 
                    {t("builderSessionDurationLabel")}
                  </Text>
                  <CardInput
                    placeholder={t("builderPlaceholderExample45")}
                    keyboardType="number-pad"
                    value={String(draft.estimatedMinutes)}
                    onChangeText={(value) =>
                      setDraft((prev) => ({ ...prev, estimatedMinutes: Math.max(10, Number(value || 10)) }))
                    }
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}> 
                {t("builderUnits")}
              </Text>
              <View style={styles.twoColumns}>
                <SelectPill
                  label={t("kg")}
                  active={unitSystem === "kg"}
                  onPress={() => toggleUnitSystem("kg")}
                  compact
                />
                <SelectPill
                  label={t("lbs")}
                  active={unitSystem === "lbs"}
                  onPress={() => toggleUnitSystem("lbs")}
                  compact
                />
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: theme.textMuted, fontFamily: "Syne_700Bold" }]}> 
                  {t("builderSelectDay").toUpperCase()}
                </Text>
                <Pressable onPress={addDay}>
                  <Text style={[styles.sectionAction, { color: theme.accent, fontFamily: "Syne_700Bold" }]}> 
                    {t("builderAddDay")}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.daysList}>
                {draft.days.map((day, index) => (
                  <Card key={day.id} style={[styles.dayCard, { borderLeftColor: `${theme.accent}55` }]}> 
                    <View style={styles.dayHeaderRow}>
                      <Text style={[styles.dayTitle, { color: theme.text, fontFamily: "Syne_700Bold" }]}> 
                        {formatTemplate(t("builderDayLabelPattern"), { index: index + 1 })}
                      </Text>
                      {draft.days.length > 1 ? (
                        <Pressable onPress={() => removeDay(day.id)}>
                          <Ionicons name="trash-outline" size={17} color={theme.textMuted} />
                        </Pressable>
                      ) : null}
                    </View>

                    <CardInput
                      placeholder={t("builderDayNamePlaceholder")}
                      value={day.label}
                      onChangeText={(value) => updateDay(day.id, { label: value })}
                      containerStyle={styles.inputSpacing}
                    />

                    <CardInput
                      placeholder={t("builderFocusPlaceholder")}
                      value={day.focus}
                      onChangeText={(value) => updateDay(day.id, { focus: value })}
                    />
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <>
              {dayTabs.length > 1 ? (
                <PillTabs
                  tabs={dayTabs}
                  active={activeDayId}
                  onChange={setActiveDayId}
                  style={styles.dayTabsWrap}
                />
              ) : null}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {muscleTabs.map((muscle) => {
                  const active = muscleFilter === muscle;
                  const label = muscle === "all" ? t("builderFilterModeAll") : t(getMuscleLabelKey(muscle));

                  return (
                    <Pressable
                      key={`muscle-${muscle}`}
                      onPress={() => setMuscleFilter(muscle)}
                      style={({ pressed }) => [
                        styles.filterChip,
                        {
                          backgroundColor: active ? theme.accent : theme.cardElevated,
                          borderColor: active ? theme.accent : theme.border,
                          opacity: pressed ? 0.84 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: active ? "#fff" : theme.textSecondary,
                            fontFamily: active ? "Syne_700Bold" : "DMSans_600SemiBold",
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <CardInput
                placeholder={t("builderSearchExercisePlaceholder")}
                icon="search"
                value={exerciseQuery}
                onChangeText={setExerciseQuery}
                containerStyle={styles.searchInput}
              />

              <Text style={[styles.sectionTitle, { color: theme.accent, fontFamily: "Syne_700Bold" }]}> 
                {formatTemplate(t("builderAddedSection"), { count: addedExercises.length }).toUpperCase()}
              </Text>

              <View style={styles.exercisesStack}>
                {!addedExercises.length ? (
                  <Card style={[styles.emptyCard, { borderLeftColor: `${theme.accent}55` }]}> 
                    <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "DMSans_500Medium" }]}> 
                      {t("builderNoExercisesAdded")}
                    </Text>
                  </Card>
                ) : (
                  addedExercises.map((exercise) => {
                    const weightValue = formatWeightForUnit(exercise.weightKg, unitSystem);
                    const weightLabel = weightValue ? `${weightValue}${unitSystem}` : t("bodyweight");

                    return (
                      <Card key={exercise.id} style={[styles.exerciseCard, { borderLeftColor: `${theme.accent}55` }]}> 
                        <View style={styles.exerciseTopRow}>
                          <View style={styles.exerciseMain}>
                            <Text style={[styles.exerciseName, { color: theme.text, fontFamily: "Syne_700Bold" }]}> 
                              {exercise.name}
                            </Text>
                            <Text
                              style={[
                                styles.exerciseMeta,
                                { color: theme.textMuted, fontFamily: "DMSans_500Medium" },
                              ]}
                            >
                              {`${exercise.sets} × ${exercise.reps} · ${weightLabel} · ${exercise.restSeconds}s ${t("rest")}`}
                            </Text>
                          </View>

                          {activeDay ? (
                            <View style={styles.exerciseActions}>
                              <Pressable
                                onPress={() => openExerciseEdit(activeDay.id, exercise.id)}
                                style={({ pressed }) => [
                                  styles.squareAction,
                                  {
                                    backgroundColor: theme.cardElevated,
                                    borderColor: theme.border,
                                    opacity: pressed ? 0.84 : 1,
                                  },
                                ]}
                              >
                                <Ionicons name="create-outline" size={17} color={theme.textSecondary} />
                              </Pressable>

                              <Pressable
                                onPress={() => removeExercise(activeDay.id, exercise.id)}
                                style={({ pressed }) => [
                                  styles.squareAction,
                                  {
                                    backgroundColor: theme.cardElevated,
                                    borderColor: theme.border,
                                    opacity: pressed ? 0.84 : 1,
                                  },
                                ]}
                              >
                                <Ionicons name="trash-outline" size={17} color={theme.textSecondary} />
                              </Pressable>
                            </View>
                          ) : null}
                        </View>
                      </Card>
                    );
                  })
                )}
              </View>

              <Text style={[styles.sectionTitle, { color: theme.textMuted, fontFamily: "Syne_700Bold" }]}> 
                {t("builderLibrarySection").toUpperCase()}
              </Text>

              <View style={styles.exercisesStack}>
                {!libraryExercises.length ? (
                  <Card style={[styles.emptyCard, { borderLeftColor: `${theme.accent}55` }]}> 
                    <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "DMSans_500Medium" }]}> 
                      {t("builderNoExercisesForFilter")}
                    </Text>
                  </Card>
                ) : (
                  libraryExercises.slice(0, 40).map((exercise) => (
                    <Card key={exercise.id} style={[styles.libraryCard, { borderLeftColor: `${theme.accent}55` }]}> 
                      <View style={styles.exerciseMain}>
                        <Text style={[styles.exerciseName, { color: theme.text, fontFamily: "Syne_700Bold" }]}> 
                          {exercise.name}
                        </Text>
                        <Text style={[styles.exerciseMeta, { color: theme.textMuted, fontFamily: "DMSans_500Medium" }]}> 
                          {`${exercise.muscles.map((muscle) => t(getMuscleLabelKey(muscle))).join(" · ")} · ${t(
                            exercise.equipment as TranslationKey
                          )}`}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => addExerciseToActiveDay(exercise.id)}
                        style={({ pressed }) => [
                          styles.addExerciseBtn,
                          {
                            backgroundColor: theme.accent,
                            opacity: pressed ? 0.82 : 1,
                          },
                        ]}
                      >
                        <Ionicons name="add" size={20} color="#fff" />
                      </Pressable>
                    </Card>
                  ))
                )}
              </View>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <Card style={[styles.reviewCard, { borderLeftColor: `${theme.accent}88` }]}> 
                <Text style={[styles.reviewTitle, { color: theme.text, fontFamily: "Syne_800ExtraBold" }]}> 
                  {draft.title || t("builderNewProgramTitle")}
                </Text>
                <Text style={[styles.reviewMeta, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}> 
                  {`${mode === "home" ? t("builderTypeHome") : mode === "gym" ? t("builderTypeGym") : t("builderTypeCardio")} · ${draft.daysPerWeek} ${t("days")} · ${draft.estimatedMinutes} ${t("minutes")}`}
                </Text>
                <Text style={[styles.reviewMeta, { color: theme.textSecondary, fontFamily: "DMSans_500Medium" }]}> 
                  {`${summary.totalExercises} ${t("exercises")} · ${summary.totalSets} ${t("sets")}`}
                </Text>
              </Card>

              <Text style={[styles.sectionTitle, { color: theme.textMuted, fontFamily: "Syne_700Bold" }]}> 
                {t("builderMyPrograms").toUpperCase()}
              </Text>

              <View style={styles.programList}>
                {programs.map((program) => (
                  <Card key={program.id} style={[styles.savedProgramCard, { borderLeftColor: `${theme.accent}55` }]}> 
                    <View style={styles.savedProgramMain}>
                      <Text style={[styles.savedProgramTitle, { color: theme.text, fontFamily: "Syne_700Bold" }]}> 
                        {program.title}
                      </Text>
                      <Text
                        style={[
                          styles.savedProgramMeta,
                          { color: theme.textSecondary, fontFamily: "DMSans_500Medium" },
                        ]}
                      >
                        {`${program.days.length} ${t("days")} · ${program.days.reduce((acc, day) => acc + day.exercises.length, 0)} ${t("exercises")}`}
                      </Text>
                    </View>

                    <View style={styles.savedActions}>
                      <IconButton icon="create-outline" onPress={() => editProgram(program)} />
                      <IconButton icon="copy-outline" onPress={() => duplicateProgram(program)} />
                      <IconButton icon="trash-outline" onPress={() => deleteProgram(program.id)} />
                    </View>
                  </Card>
                ))}
              </View>

              {saveError ? (
                <Text style={[styles.saveErrorText, { color: theme.error, fontFamily: "DMSans_600SemiBold" }]}>
                  {saveError}
                </Text>
              ) : null}

              <GhostButton label={t("builderResetDraftCta")} onPress={resetDraft} />
            </>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: Platform.OS === "web" ? 20 : insets.bottom + 12,
          },
        ]}
      >
        <PrimaryButton label={stepCtaLabel} onPress={onMainCtaPress} />
      </View>

      <BottomSheet
        visible={!!editingExercise}
        onClose={() => setEditingExercise(null)}
        title={t("builderEditExerciseTitle")}
      >
        {editingExercise ? (
          <View style={styles.sheetForm}>
            <View style={styles.twoColumns}>
              <View style={styles.columnItem}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}> 
                  {t("builderFieldSets")}
                </Text>
                <CardInput
                  keyboardType="number-pad"
                  value={editingExercise.sets}
                  onChangeText={(value) => setEditingExercise((prev) => (prev ? { ...prev, sets: value } : prev))}
                />
              </View>
              <View style={styles.columnItem}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}> 
                  {t("builderFieldReps")}
                </Text>
                <CardInput
                  value={editingExercise.reps}
                  onChangeText={(value) => setEditingExercise((prev) => (prev ? { ...prev, reps: value } : prev))}
                />
              </View>
            </View>

            <View style={styles.twoColumns}>
              <View style={styles.columnItem}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}> 
                  {t("builderFieldRestSeconds")}
                </Text>
                <CardInput
                  keyboardType="number-pad"
                  value={editingExercise.restSeconds}
                  onChangeText={(value) =>
                    setEditingExercise((prev) => (prev ? { ...prev, restSeconds: value } : prev))
                  }
                />
              </View>
              <View style={styles.columnItem}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}> 
                  {`${t("builderFieldWeight")} (${unitSystem})`}
                </Text>
                <CardInput
                  keyboardType="decimal-pad"
                  value={editingExercise.weight}
                  onChangeText={(value) => setEditingExercise((prev) => (prev ? { ...prev, weight: value } : prev))}
                />
              </View>
            </View>

            <PrimaryButton label={t("save")} onPress={applyExerciseEdit} />
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: {
    paddingHorizontal: 20,
    gap: 14,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.8,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleText: {
    fontSize: 17,
  },
  stepLine: {
    flex: 1,
    height: 1,
    marginHorizontal: 6,
  },
  stepLabel: {
    fontSize: 13,
    letterSpacing: 1,
  },
  contentWrap: {
    paddingHorizontal: 20,
    gap: 14,
  },
  fieldLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  inputSpacing: {
    marginBottom: 10,
  },
  threeColWrap: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 6,
  },
  goalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 6,
  },
  selectPill: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    flexBasis: "48%",
  },
  selectPillCompact: {
    minHeight: 52,
    flexBasis: "31%",
  },
  selectPillText: {
    fontSize: 17,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    letterSpacing: 1,
  },
  sectionAction: {
    fontSize: 13,
  },
  twoColumns: {
    flexDirection: "row",
    gap: 10,
  },
  columnItem: {
    flex: 1,
  },
  daysList: {
    gap: 10,
    marginTop: 2,
  },
  dayCard: {
    borderLeftWidth: 3,
    padding: 12,
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayTitle: {
    fontSize: 15,
  },
  dayTabsWrap: {
    marginBottom: 4,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 2,
    marginBottom: 8,
  },
  filterChip: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: 15,
  },
  searchInput: {
    marginBottom: 6,
  },
  exercisesStack: {
    gap: 10,
  },
  emptyCard: {
    borderLeftWidth: 3,
    alignItems: "center",
    paddingVertical: 15,
  },
  emptyText: {
    fontSize: 14,
  },
  exerciseCard: {
    borderLeftWidth: 3,
    padding: 14,
    borderRadius: 24,
  },
  exerciseTopRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  exerciseMain: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    lineHeight: 22,
  },
  exerciseMeta: {
    fontSize: 14,
    marginTop: 4,
  },
  exerciseActions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  squareAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  libraryCard: {
    borderLeftWidth: 3,
    borderRadius: 24,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addExerciseBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewCard: {
    borderLeftWidth: 3,
    borderRadius: 24,
    padding: 14,
    gap: 6,
  },
  reviewTitle: {
    fontSize: 28,
    lineHeight: 30,
  },
  reviewMeta: {
    fontSize: 14,
  },
  programList: {
    gap: 8,
  },
  savedProgramCard: {
    borderLeftWidth: 3,
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  savedProgramMain: {
    flex: 1,
  },
  savedProgramTitle: {
    fontSize: 16,
  },
  savedProgramMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  savedActions: {
    flexDirection: "row",
    gap: 6,
  },
  saveErrorText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetForm: {
    gap: 12,
  },
});
