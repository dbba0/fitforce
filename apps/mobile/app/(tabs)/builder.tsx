import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { useLanguage } from "@/contexts/LanguageContext";
import { EXERCISES, MuscleGroup } from "@/data/exercises";
import { PROGRAMS, Program } from "@/data/programs";
import {
  createEmptyProgram,
  createId,
  CustomExerciseItem,
  CustomProgram,
  CustomProgramMode,
  getCustomPrograms,
  saveCustomPrograms,
} from "@/utils/customProgramStorage";

type UnitSystem = "kg" | "lbs";
type MuscleFilter = "all" | MuscleGroup;

const UNIT_KEY = "@fitforce_builder_units";
const LBS_PER_KG = 2.20462;

const MUSCLE_FILTERS: MuscleFilter[] = ["all", "chest", "back", "shoulders", "arms", "core", "legs"];

function getExerciseName(exerciseId: string, language: string): string {
  const ex = EXERCISES.find((item) => item.id === exerciseId);
  if (!ex) return exerciseId;
  const tr = ex.translations[language as keyof typeof ex.translations] ?? ex.translations.en;
  return tr.name;
}

function toCustomProgramFromTemplate(template: Program, title: string): CustomProgram {
  const dayId = createId("day");
  const exercises: CustomExerciseItem[] = template.workouts.map((w) => ({
    id: createId("ex"),
    exerciseId: w.exerciseId,
    sets: Number(w.sets || 3),
    reps: String(w.reps ?? "10"),
    restSeconds: Number(w.restSeconds || 60),
    weightKg: w.weightKg,
  }));

  return {
    id: createId("cp"),
    title,
    description: "Cree depuis un template premium",
    mode: template.isCardio ? "cardio" : template.type,
    difficulty: template.difficulty,
    daysPerWeek: template.sessionsPerWeek || 3,
    estimatedMinutes: template.durationMin || 45,
    days: [
      {
        id: dayId,
        label: "Jour 1",
        focus: template.category,
        exercises,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function kgToLbs(kg: number): number {
  return kg * LBS_PER_KG;
}

function lbsToKg(lbs: number): number {
  return lbs / LBS_PER_KG;
}

function formatWeightForUnit(weightKg: number | undefined, unit: UnitSystem): string {
  const value = Number(weightKg || 0);
  if (!value) return "";
  return unit === "kg" ? String(Math.round(value)) : String(Math.round(kgToLbs(value)));
}

function parseWeightInput(input: string, unit: UnitSystem): number {
  const n = Number(input || 0);
  if (!n) return 0;
  return unit === "kg" ? n : Number(lbsToKg(n).toFixed(2));
}

export default function BuilderScreen() {
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const [mode, setMode] = useState<CustomProgramMode>("gym");
  const [programs, setPrograms] = useState<CustomProgram[]>([]);
  const [draft, setDraft] = useState<CustomProgram>(createEmptyProgram("gym"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [pickerMuscleFilter, setPickerMuscleFilter] = useState<MuscleFilter>("all");
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("kg");

  useEffect(() => {
    getCustomPrograms().then(setPrograms).catch(() => setPrograms([]));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(UNIT_KEY)
      .then((saved) => {
        if (saved === "kg" || saved === "lbs") setUnitSystem(saved);
      })
      .catch(() => {});
  }, []);

  const templatePrograms = useMemo(
    () =>
      PROGRAMS.filter((p) => {
        if (mode === "cardio") return !!p.isCardio;
        return p.type === mode && !p.isCardio;
      }).slice(0, 8),
    [mode]
  );

  const pickerExercises = useMemo(() => {
    const filteredByMode = EXERCISES.filter((ex) =>
      mode === "cardio" ? !!ex.isCardio : !ex.isCardio
    );
    const filteredByMuscle =
      pickerMuscleFilter === "all"
        ? filteredByMode
        : filteredByMode.filter((ex) => ex.muscles.includes(pickerMuscleFilter));
    const q = exerciseQuery.trim().toLowerCase();
    if (!q) return filteredByMuscle.slice(0, 80);
    return filteredByMuscle.filter((ex) => {
      const name = getExerciseName(ex.id, language).toLowerCase();
      return name.includes(q) || ex.muscles.join(" ").includes(q);
    });
  }, [mode, exerciseQuery, language, pickerMuscleFilter]);

  const summary = useMemo(() => {
    const totalExercises = draft.days.reduce((acc, d) => acc + d.exercises.length, 0);
    const totalSets = draft.days.reduce(
      (acc, d) => acc + d.exercises.reduce((sum, ex) => sum + (Number(ex.sets) || 0), 0),
      0
    );
    return { totalExercises, totalSets };
  }, [draft.days]);

  const openExercisePicker = (dayId: string) => {
    setPickerDayId(dayId);
    setExerciseQuery("");
    setPickerMuscleFilter("all");
    setPickerVisible(true);
  };

  const addExerciseToDay = (exerciseId: string) => {
    if (!pickerDayId) return;
    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.id === pickerDayId
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                {
                  id: createId("ex"),
                  exerciseId,
                  sets: 4,
                  reps: "10-12",
                  restSeconds: 75,
                  weightKg: mode === "gym" ? 20 : undefined,
                },
              ],
            }
          : day
      ),
    }));
    setPickerVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updateExercise = (dayId: string, exId: string, patch: Partial<CustomExerciseItem>) => {
    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((ex) => (ex.id === exId ? { ...ex, ...patch } : ex)),
            }
          : day
      ),
    }));
  };

  const removeExercise = (dayId: string, exId: string) => {
    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((day) =>
        day.id === dayId
          ? { ...day, exercises: day.exercises.filter((ex) => ex.id !== exId) }
          : day
      ),
    }));
  };

  const addDay = () => {
    setDraft((prev) => ({
      ...prev,
      days: [
        ...prev.days,
        {
          id: createId("day"),
          label: `Jour ${prev.days.length + 1}`,
          focus: mode === "cardio" ? "Cardio Focus" : "Muscle Focus",
          exercises: [],
        },
      ],
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeDay = (dayId: string) => {
    setDraft((prev) => {
      if (prev.days.length <= 1) return prev;
      return { ...prev, days: prev.days.filter((d) => d.id !== dayId) };
    });
  };

  const saveDraft = async () => {
    if (!draft.title.trim()) {
      Alert.alert("Builder", "Ajoute un nom de programme.");
      return;
    }
    if (summary.totalExercises === 0) {
      Alert.alert("Builder", "Ajoute au moins un exercice.");
      return;
    }

    const next = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    const updated = editingId
      ? programs.map((p) => (p.id === editingId ? next : p))
      : [{ ...next, id: createId("cp"), createdAt: new Date().toISOString() }, ...programs];

    await saveCustomPrograms(updated);
    setPrograms(updated);
    setEditingId(null);
    setDraft(createEmptyProgram(mode));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Builder", editingId ? "Programme mis a jour." : "Programme enregistre.");
  };

  const toggleUnitSystem = async (next: UnitSystem) => {
    setUnitSystem(next);
    await AsyncStorage.setItem(UNIT_KEY, next);
  };

  const getMuscleLabel = (m: MuscleFilter) => {
    if (m === "all") return t("allMuscles");
    if (m === "back") return t("backMuscle");
    return t(m as any);
  };

  const editProgram = (program: CustomProgram) => {
    setDraft(JSON.parse(JSON.stringify(program)));
    setEditingId(program.id);
    setMode(program.mode);
  };

  const duplicateProgram = async (program: CustomProgram) => {
    const copy: CustomProgram = {
      ...JSON.parse(JSON.stringify(program)),
      id: createId("cp"),
      title: `${program.title} (Copie)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [copy, ...programs];
    await saveCustomPrograms(updated);
    setPrograms(updated);
  };

  const deleteProgram = async (id: string) => {
    const updated = programs.filter((p) => p.id !== id);
    await saveCustomPrograms(updated);
    setPrograms(updated);
  };

  const importTemplate = async (template: Program) => {
    const created = toCustomProgramFromTemplate(template, `${t(template.nameKey as any)} Elite`);
    const updated = [created, ...programs];
    await saveCustomPrograms(updated);
    setPrograms(updated);
    setDraft(JSON.parse(JSON.stringify(created)));
    setEditingId(created.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 10,
        paddingBottom: Platform.OS === "web" ? 130 : 120,
      }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={["#0F172A", "#1E293B", "#0B1220"]} style={styles.hero}>
        <Text style={[styles.heroTitle, { fontFamily: "Outfit_800ExtraBold" }]}>Program Builder</Text>
        <Text style={[styles.heroSub, { fontFamily: "Outfit_400Regular" }]}>
          Creer des plans ultra-personnalises: exercices, series, reps, repos, charge.
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { fontFamily: "Outfit_800ExtraBold" }]}>{programs.length}</Text>
            <Text style={[styles.statLabel, { fontFamily: "Outfit_500Medium" }]}>Programmes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { fontFamily: "Outfit_800ExtraBold" }]}>{summary.totalExercises}</Text>
            <Text style={[styles.statLabel, { fontFamily: "Outfit_500Medium" }]}>Exercices draft</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { fontFamily: "Outfit_800ExtraBold" }]}>{summary.totalSets}</Text>
            <Text style={[styles.statLabel, { fontFamily: "Outfit_500Medium" }]}>Series</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.segment}>
        {(["home", "gym", "cardio"] as CustomProgramMode[]).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setDraft((prev) => ({ ...prev, mode: m }));
              }}
              style={[styles.segmentBtn, { backgroundColor: active ? theme.accent : theme.card }]}
            >
              <Text style={[styles.segmentText, { color: active ? "#fff" : theme.textSecondary, fontFamily: "Outfit_600SemiBold" }]}>
                {m === "home" ? t("homeWorkouts") : m === "gym" ? t("gymWorkouts") : t("cardio")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>Unites</Text>
        <View style={styles.unitSwitch}>
          <Pressable
            onPress={() => toggleUnitSystem("kg")}
            style={[styles.unitBtn, { backgroundColor: unitSystem === "kg" ? theme.accent : theme.card }]}
          >
            <Text style={{ color: unitSystem === "kg" ? "#fff" : theme.textSecondary, fontFamily: "Outfit_700Bold" }}>kg</Text>
          </Pressable>
          <Pressable
            onPress={() => toggleUnitSystem("lbs")}
            style={[styles.unitBtn, { backgroundColor: unitSystem === "lbs" ? theme.accent : theme.card }]}
          >
            <Text style={{ color: unitSystem === "lbs" ? "#fff" : theme.textSecondary, fontFamily: "Outfit_700Bold" }}>lbs</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>Templates premium</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {templatePrograms.map((program) => (
            <Pressable key={program.id} onPress={() => importTemplate(program)}>
              <LinearGradient colors={program.gradient} style={styles.templateCard}>
                <Text style={[styles.templateTitle, { fontFamily: "Outfit_700Bold" }]}>{t(program.nameKey as any)}</Text>
                <Text style={[styles.templateMeta, { fontFamily: "Outfit_500Medium" }]}>
                  {program.workouts.length} exo · {program.durationMin} min
                </Text>
                <View style={styles.templateCta}>
                  <Ionicons name="copy-outline" size={14} color={program.gradient[0]} />
                  <Text style={[styles.templateCtaText, { fontFamily: "Outfit_700Bold" }]}>Dupliquer</Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.editorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
          {editingId ? "Edition du programme" : "Nouveau programme"}
        </Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Nom du programme"
          placeholderTextColor={theme.textMuted}
          value={draft.title}
          onChangeText={(v) => setDraft((p) => ({ ...p, title: v }))}
        />
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
          placeholder="Description"
          placeholderTextColor={theme.textMuted}
          value={draft.description}
          onChangeText={(v) => setDraft((p) => ({ ...p, description: v }))}
        />
        <View style={styles.row}>
          <View style={styles.rowInputWrap}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
              Jours / semaine
            </Text>
            <TextInput
              style={[styles.input, styles.rowInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: 4"
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              value={String(draft.daysPerWeek)}
              onChangeText={(v) => setDraft((p) => ({ ...p, daysPerWeek: Math.max(1, Number(v || 1)) }))}
            />
          </View>
          <View style={styles.rowInputWrap}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
              Duree seance (min)
            </Text>
            <TextInput
              style={[styles.input, styles.rowInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Ex: 45"
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              value={String(draft.estimatedMinutes)}
              onChangeText={(v) => setDraft((p) => ({ ...p, estimatedMinutes: Math.max(10, Number(v || 10)) }))}
            />
          </View>
        </View>

        {draft.days.map((day, dayIndex) => (
          <Animated.View
            key={day.id}
            entering={FadeInDown.delay(dayIndex * 60).duration(320)}
            style={[styles.dayCard, { backgroundColor: theme.background, borderColor: theme.border }]}
          >
            <View style={styles.dayHeader}>
              <Text style={[styles.dayTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{day.label}</Text>
              <Pressable onPress={() => removeDay(day.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={theme.error} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Nom du jour (Push, Pull, Legs...)"
              placeholderTextColor={theme.textMuted}
              value={day.label}
              onChangeText={(v) =>
                setDraft((prev) => ({
                  ...prev,
                  days: prev.days.map((d) => (d.id === day.id ? { ...d, label: v } : d)),
                }))
              }
            />
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Focus musculaire"
              placeholderTextColor={theme.textMuted}
              value={day.focus}
              onChangeText={(v) =>
                setDraft((prev) => ({
                  ...prev,
                  days: prev.days.map((d) => (d.id === day.id ? { ...d, focus: v } : d)),
                }))
              }
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.muscleRow}>
              {MUSCLE_FILTERS.filter((m) => m !== "all").map((m) => {
                const active = day.focus.toLowerCase() === m;
                return (
                  <Pressable
                    key={`${day.id}_${m}`}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        days: prev.days.map((d) => (d.id === day.id ? { ...d, focus: m } : d)),
                      }))
                    }
                    style={[
                      styles.muscleChip,
                      {
                        borderColor: active ? theme.accent : theme.border,
                        backgroundColor: active ? `${theme.accent}25` : theme.card,
                      },
                    ]}
                  >
                    <Text style={{ color: active ? theme.accent : theme.textSecondary, fontFamily: "Outfit_500Medium", fontSize: 12 }}>
                      {getMuscleLabel(m)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {day.exercises.map((ex) => (
              <View key={ex.id} style={[styles.exerciseBlock, { borderColor: theme.border }]}>
                <View style={styles.exerciseTop}>
                  <Text style={[styles.exerciseName, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
                    {getExerciseName(ex.exerciseId, language)}
                  </Text>
                  <Pressable onPress={() => removeExercise(day.id, ex.id)} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={theme.error} />
                  </Pressable>
                </View>
                <View style={styles.row}>
                  <View style={styles.rowInputWrap}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                      Series
                    </Text>
                    <TextInput
                      style={[styles.input, styles.rowInput, { color: theme.text, borderColor: theme.border }]}
                      keyboardType="number-pad"
                      placeholder="Ex: 4"
                      placeholderTextColor={theme.textMuted}
                      value={String(ex.sets)}
                      onChangeText={(v) => updateExercise(day.id, ex.id, { sets: Math.max(1, Number(v || 1)) })}
                    />
                  </View>
                  <View style={styles.rowInputWrap}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                      Repetitions
                    </Text>
                    <TextInput
                      style={[styles.input, styles.rowInput, { color: theme.text, borderColor: theme.border }]}
                      placeholder="Ex: 10-12"
                      placeholderTextColor={theme.textMuted}
                      value={String(ex.reps)}
                      onChangeText={(v) => updateExercise(day.id, ex.id, { reps: v })}
                    />
                  </View>
                  <View style={styles.rowInputWrap}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                      Repos (sec)
                    </Text>
                    <TextInput
                      style={[styles.input, styles.rowInput, { color: theme.text, borderColor: theme.border }]}
                      keyboardType="number-pad"
                      placeholder="Ex: 60"
                      placeholderTextColor={theme.textMuted}
                      value={String(ex.restSeconds)}
                      onChangeText={(v) =>
                        updateExercise(day.id, ex.id, { restSeconds: Math.max(0, Number(v || 0)) })
                      }
                    />
                  </View>
                </View>
                {mode !== "home" && (
                  <View>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                      Charge ({unitSystem})
                    </Text>
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                      keyboardType="decimal-pad"
                      placeholder={unitSystem === "kg" ? "Ex: 40" : "Ex: 90"}
                      placeholderTextColor={theme.textMuted}
                      value={formatWeightForUnit(ex.weightKg, unitSystem)}
                      onChangeText={(v) => updateExercise(day.id, ex.id, { weightKg: parseWeightInput(v, unitSystem) })}
                    />
                  </View>
                )}
              </View>
            ))}

            <Pressable style={[styles.secondaryBtn, { borderColor: theme.accent }]} onPress={() => openExercisePicker(day.id)}>
              <Ionicons name="add-circle-outline" size={16} color={theme.accent} />
              <Text style={[styles.secondaryBtnText, { color: theme.accent, fontFamily: "Outfit_600SemiBold" }]}>
                Ajouter un exercice
              </Text>
            </Pressable>
          </Animated.View>
        ))}

        <Pressable style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={addDay}>
          <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.secondaryBtnText, { color: theme.textSecondary, fontFamily: "Outfit_600SemiBold" }]}>
            Ajouter un jour
          </Text>
        </Pressable>

        <Pressable style={[styles.primaryBtn, { backgroundColor: theme.accent }]} onPress={saveDraft}>
          <Ionicons name="save-outline" size={18} color="#fff" />
          <Text style={[styles.primaryBtnText, { fontFamily: "Outfit_700Bold" }]}>
            {editingId ? "Mettre a jour" : "Sauvegarder le programme"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
          Mes programmes ({programs.length})
        </Text>
        {programs.map((program) => (
          <View key={program.id} style={[styles.savedCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.savedTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{program.title}</Text>
              <Text style={[styles.savedMeta, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
                {program.days.length} jours · {program.days.reduce((acc, d) => acc + d.exercises.length, 0)} exos · {program.estimatedMinutes} min
              </Text>
            </View>
            <View style={styles.actionsCol}>
              <Pressable onPress={() => editProgram(program)} style={[styles.iconBtn, { backgroundColor: theme.accent }]}>
                <Ionicons name="create-outline" size={14} color="#fff" />
              </Pressable>
              <Pressable onPress={() => duplicateProgram(program)} style={[styles.iconBtn, { backgroundColor: theme.success }]}>
                <Ionicons name="copy-outline" size={14} color="#fff" />
              </Pressable>
              <Pressable onPress={() => deleteProgram(program.id)} style={[styles.iconBtn, { backgroundColor: theme.error }]}>
                <Ionicons name="trash-outline" size={14} color="#fff" />
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={[styles.modalRoot, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>Choisir un exercice</Text>
            <Pressable onPress={() => setPickerVisible(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, marginHorizontal: 20 }]}
            placeholder="Rechercher un exercice"
            placeholderTextColor={theme.textMuted}
            value={exerciseQuery}
            onChangeText={setExerciseQuery}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.muscleRow, { paddingHorizontal: 20 }]}
          >
            {MUSCLE_FILTERS.map((mf) => {
              const active = pickerMuscleFilter === mf;
              return (
                <Pressable
                  key={`picker_${mf}`}
                  onPress={() => setPickerMuscleFilter(mf)}
                  style={[
                    styles.muscleChip,
                    {
                      borderColor: active ? theme.accent : theme.border,
                      backgroundColor: active ? `${theme.accent}20` : theme.card,
                    },
                  ]}
                >
                  <Text style={{ color: active ? theme.accent : theme.textSecondary, fontFamily: "Outfit_500Medium", fontSize: 12 }}>
                    {getMuscleLabel(mf)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}>
            {pickerExercises.map((ex) => (
              <Pressable
                key={ex.id}
                onPress={() => addExerciseToDay(ex.id)}
                style={[styles.pickerRow, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View>
                  <Text style={[styles.pickerName, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
                    {getExerciseName(ex.id, language)}
                  </Text>
                  <Text style={[styles.pickerMeta, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                    {t(ex.difficulty)} · {t(ex.equipment as any)} · {ex.calories} kcal · {ex.muscles.map((m) => getMuscleLabel(m)).join(" / ")}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={22} color={theme.accent} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  heroTitle: { color: "#fff", fontSize: 28, lineHeight: 32 },
  heroSub: { color: "rgba(255,255,255,0.82)", marginTop: 8, fontSize: 13, lineHeight: 18 },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  statValue: { color: "#fff", fontSize: 20 },
  statLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2 },
  segment: {
    marginHorizontal: 16,
    marginBottom: 14,
    flexDirection: "row",
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentText: { fontSize: 12 },
  unitSwitch: { flexDirection: "row", gap: 8 },
  unitBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  section: { marginHorizontal: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 19, marginBottom: 10 },
  templateCard: { width: 168, borderRadius: 14, padding: 12 },
  templateTitle: { color: "#fff", fontSize: 16 },
  templateMeta: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 4 },
  templateCta: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  templateCtaText: { fontSize: 12, color: "#111827" },
  editorCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Outfit_400Regular",
    marginBottom: 8,
  },
  row: { flexDirection: "row", gap: 8 },
  rowInputWrap: { flex: 1 },
  fieldLabel: { fontSize: 11, marginBottom: 6 },
  rowInput: { flex: 1 },
  dayCard: { borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 8 },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayTitle: { fontSize: 15 },
  muscleRow: { gap: 8, paddingBottom: 4, marginBottom: 4 },
  muscleChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exerciseBlock: { borderWidth: 1, borderRadius: 10, padding: 8, marginTop: 8 },
  exerciseTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  exerciseName: { fontSize: 14 },
  secondaryBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  secondaryBtnText: { fontSize: 13 },
  primaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 15 },
  savedCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savedTitle: { fontSize: 15 },
  savedMeta: { fontSize: 12, marginTop: 4 },
  actionsCol: { flexDirection: "row", gap: 6 },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalRoot: { flex: 1, paddingTop: Platform.OS === "ios" ? 54 : 24 },
  modalHeader: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 20 },
  pickerRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerName: { fontSize: 14 },
  pickerMeta: { fontSize: 12, marginTop: 4 },
});
