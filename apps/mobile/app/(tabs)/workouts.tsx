import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  useColorScheme,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { Colors } from "@/constants/colors";
import { PROGRAMS, Program } from "@/data/programs";
import { EXERCISES, MuscleGroup } from "@/data/exercises";

type Tab = "home" | "gym" | "cardio";
type MuscleFilter = "all" | MuscleGroup;

function ProgramCard({ program, index }: { program: Program; index: number }) {
  const { t } = useLanguage();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (program.isCardio) {
      router.push({ pathname: "/cardio/[id]", params: { id: program.id } });
    } else {
      router.push({ pathname: "/program/[id]", params: { id: program.id } });
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400)}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
      >
        <LinearGradient
          colors={program.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.programCard}
        >
          <View style={styles.programHeader}>
            <View>
              <Text style={[styles.programCategory, { fontFamily: "Outfit_600SemiBold" }]}>
                {t(program.nameKey as any).toUpperCase()}
              </Text>
              <Text style={[styles.programType, { fontFamily: "Outfit_500Medium" }]}>
                {program.isCardio
                  ? (program.type === "home" ? t("cardioHome") : t("cardioGym"))
                  : (program.type === "home" ? t("homeWorkouts") : t("gymWorkouts"))}
              </Text>
            </View>
            <View style={[styles.difficultyBadge, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
              <Text style={[styles.difficultyText, { fontFamily: "Outfit_600SemiBold" }]}>
                {t(program.difficulty)}
              </Text>
            </View>
          </View>

          <View style={styles.programStats}>
            <View style={styles.programStat}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.programStatText, { fontFamily: "Outfit_500Medium" }]}>
                {program.durationMin} {t("minutes")}
              </Text>
            </View>
            <View style={styles.programStat}>
              <Ionicons name="barbell-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.programStatText, { fontFamily: "Outfit_500Medium" }]}>
                {program.workouts.length} {t("exercises")}
              </Text>
            </View>
            <View style={styles.programStat}>
              <Ionicons name="flame-outline" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={[styles.programStatText, { fontFamily: "Outfit_500Medium" }]}>
                {program.caloriesPerSession} {t("kcal")}
              </Text>
            </View>
          </View>

          <View style={styles.programFooter}>
            <Text style={[styles.programWeeks, { fontFamily: "Outfit_400Regular" }]}>
              {program.totalWeeks} {t("weeks")} · {program.sessionsPerWeek}x {t("perWeek")}
            </Text>
            <View style={styles.startProgramBtn}>
              <Ionicons name="arrow-forward" size={18} color={program.gradient[0]} />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function ExerciseRow({ exerciseId, index }: { exerciseId: string; index: number }) {
  const { t, language } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const exercise = EXERCISES.find((e) => e.id === exerciseId);
  if (!exercise) return null;
  const exT = exercise.translations[language as keyof typeof exercise.translations] ?? exercise.translations.en;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/exercise/[id]", params: { id: exerciseId } });
      }}
      style={({ pressed }) => [
        styles.exerciseRow,
        {
          backgroundColor: theme.card,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.exIconWrap, { backgroundColor: exercise.imageColor + "20" }]}>
        <MaterialCommunityIcons name={exercise.isCardio ? "run-fast" : "dumbbell"} size={22} color={exercise.imageColor} />
      </View>
      <View style={styles.exInfo}>
        <Text style={[styles.exName, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>{exT.name}</Text>
        <Text style={[styles.exMeta, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
          {t(exercise.difficulty)} · {t(exercise.equipment as any)}
        </Text>
      </View>
      <View style={styles.exRight}>
        <Text style={[styles.exCalories, { color: theme.accent, fontFamily: "Outfit_600SemiBold" }]}>
          {exercise.calories} {t("kcal")}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </View>
    </Pressable>
  );
}

const MUSCLE_FILTERS: { key: MuscleFilter; icon: string }[] = [
  { key: "all", icon: "apps-outline" },
  { key: "chest", icon: "fitness-outline" },
  { key: "back", icon: "body-outline" },
  { key: "shoulders", icon: "accessibility-outline" },
  { key: "arms", icon: "hand-left-outline" },
  { key: "core", icon: "ellipse-outline" },
  { key: "legs", icon: "walk-outline" },
];

export default function WorkoutsScreen() {
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>("all");

  const filteredPrograms = useMemo(() => {
    let programs = activeTab === "cardio"
      ? PROGRAMS.filter((p) => p.isCardio === true)
      : PROGRAMS.filter((p) => p.type === activeTab && !p.isCardio);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      programs = programs.filter((p) => {
        const name = t(p.nameKey as any).toLowerCase();
        return name.includes(query);
      });
    }

    if (muscleFilter !== "all") {
      programs = programs.filter((p) =>
        p.workouts.some((w) => {
          const ex = EXERCISES.find((e) => e.id === w.exerciseId);
          return ex?.muscles.includes(muscleFilter);
        })
      );
    }

    return programs;
  }, [activeTab, searchQuery, muscleFilter, t]);

  const filteredExercises = useMemo(() => {
    let exercises = EXERCISES.filter((ex) =>
      activeTab === "cardio" ? !!ex.isCardio : !ex.isCardio
    );

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      exercises = exercises.filter((ex) => {
        const exT = ex.translations[language as keyof typeof ex.translations] ?? ex.translations.en;
        return exT.name.toLowerCase().includes(query);
      });
    }

    if (muscleFilter !== "all") {
      exercises = exercises.filter((ex) => ex.muscles.includes(muscleFilter));
    }

    return exercises;
  }, [activeTab, searchQuery, muscleFilter, language]);

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const hasMuscleFilter = muscleFilter !== "all";

  const getMuscleLabel = (key: MuscleFilter): string => {
    if (key === "all") return t("allMuscles");
    if (key === "back") return t("backMuscle");
    return t(key as any);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 16,
        paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
      }}
    >
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Outfit_800ExtraBold" }]}>
          {t("workouts")}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text, fontFamily: "Outfit_400Regular" }]}
            placeholder={t("searchWorkouts")}
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </Pressable>
          )}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={[styles.tabRow, { backgroundColor: theme.card }]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("home");
          }}
          style={[styles.tabBtn, activeTab === "home" && { backgroundColor: theme.accent }]}
        >
          <Ionicons name="home-outline" size={16} color={activeTab === "home" ? "#fff" : theme.textSecondary} />
          <Text style={[styles.tabText, {
            color: activeTab === "home" ? "#fff" : theme.textSecondary,
            fontFamily: "Outfit_600SemiBold",
          }]}>
            {t("homeWorkouts")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("gym");
          }}
          style={[styles.tabBtn, activeTab === "gym" && { backgroundColor: theme.accent }]}
        >
          <Ionicons name="barbell-outline" size={16} color={activeTab === "gym" ? "#fff" : theme.textSecondary} />
          <Text style={[styles.tabText, {
            color: activeTab === "gym" ? "#fff" : theme.textSecondary,
            fontFamily: "Outfit_600SemiBold",
          }]}>
            {t("gymWorkouts")}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("cardio");
          }}
          style={[styles.tabBtn, activeTab === "cardio" && { backgroundColor: theme.accent }]}
        >
          <Ionicons name="heart-outline" size={16} color={activeTab === "cardio" ? "#fff" : theme.textSecondary} />
          <Text style={[styles.tabText, {
            color: activeTab === "cardio" ? "#fff" : theme.textSecondary,
            fontFamily: "Outfit_600SemiBold",
          }]}>
            {t("cardio")}
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(400)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.muscleChipsContainer}
          style={styles.muscleChipsScroll}
        >
          {MUSCLE_FILTERS.map((mf) => {
            const isActive = muscleFilter === mf.key;
            return (
              <Pressable
                key={mf.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMuscleFilter(mf.key);
                }}
                style={[
                  styles.muscleChip,
                  {
                    backgroundColor: isActive ? theme.accent : theme.card,
                    borderColor: isActive ? theme.accent : theme.border,
                  },
                ]}
              >
                <Ionicons
                  name={mf.icon as any}
                  size={14}
                  color={isActive ? "#fff" : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.muscleChipText,
                    {
                      color: isActive ? "#fff" : theme.textSecondary,
                      fontFamily: "Outfit_500Medium",
                    },
                  ]}
                >
                  {getMuscleLabel(mf.key)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      {!hasMuscleFilter && (
        <View style={styles.programsSection}>
          {filteredPrograms.map((prog, i) => (
            <ProgramCard key={prog.id} program={prog} index={i} />
          ))}
        </View>
      )}

      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <Text style={[styles.exercisesTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
          {hasMuscleFilter ? `${t("exercises")} · ${getMuscleLabel(muscleFilter)}` : t("exercises")}
        </Text>
        <View style={[styles.exercisesList, { backgroundColor: theme.card }]}>
          {filteredExercises.map((ex, i) => (
            <ExerciseRow key={ex.id} exerciseId={ex.id} index={i} />
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, marginBottom: 12 },
  title: { fontSize: 32 },
  searchWrap: { paddingHorizontal: 20, marginBottom: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    margin: 0,
  },
  muscleChipsScroll: { marginBottom: 16 },
  muscleChipsContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  muscleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  muscleChipText: { fontSize: 12 },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabText: { fontSize: 13 },
  programsSection: { paddingHorizontal: 20, gap: 14, marginBottom: 28 },
  programCard: { borderRadius: 20, padding: 20 },
  programHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  programCategory: { color: "#fff", fontSize: 20 },
  programType: { color: "rgba(255,255,255,0.75)", fontSize: 13, marginTop: 2 },
  difficultyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  difficultyText: { color: "#fff", fontSize: 11 },
  programStats: { flexDirection: "row", gap: 16, marginBottom: 16 },
  programStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  programStatText: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  programFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  programWeeks: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  startProgramBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  exercisesTitle: { fontSize: 18, paddingHorizontal: 20, marginBottom: 12 },
  exercisesList: { marginHorizontal: 20, borderRadius: 16, overflow: "hidden" },
  exerciseRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.15)",
  },
  exIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  exInfo: { flex: 1 },
  exName: { fontSize: 14, marginBottom: 2 },
  exMeta: { fontSize: 12 },
  exRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  exCalories: { fontSize: 13 },
});
