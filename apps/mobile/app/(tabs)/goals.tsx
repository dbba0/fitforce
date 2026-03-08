import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  useColorScheme,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkout, Goal } from "@/contexts/WorkoutContext";
import { Colors } from "@/constants/colors";

type GoalType = "goalWeight" | "goalWorkoutsPerWeek" | "goalCalories" | "goalWaist";

const GOAL_TYPES: { type: GoalType; icon: string; unit: string; color: string }[] = [
  { type: "goalWeight", icon: "scale-outline", unit: "kg", color: "#FF6B2C" },
  { type: "goalWorkoutsPerWeek", icon: "calendar-outline", unit: "x", color: "#4CAF7D" },
  { type: "goalCalories", icon: "flame-outline", unit: "kcal", color: "#FFB547" },
  { type: "goalWaist", icon: "body-outline", unit: "cm", color: "#6C63FF" },
];

function getProgress(goal: Goal): number {
  if (goal.type === "goalWeight" || goal.type === "goalWaist") {
    if (goal.current <= goal.target) return 1;
    const total = goal.current;
    const remaining = goal.current - goal.target;
    const done = total - remaining;
    return Math.max(0, Math.min(1, done / total));
  }
  return Math.max(0, Math.min(1, goal.current / goal.target));
}

function GoalCard({ goal, onDelete }: { goal: Goal; onDelete: () => void }) {
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const goalMeta = GOAL_TYPES.find((g) => g.type === goal.type);
  const progress = getProgress(goal);
  const isAchieved = progress >= 1;

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[styles.goalCard, { backgroundColor: theme.card }]}>
      <View style={styles.goalHeader}>
        <View style={[styles.goalIconWrap, { backgroundColor: (goalMeta?.color ?? "#FF6B2C") + "20" }]}>
          <Ionicons name={goalMeta?.icon as any ?? "flag-outline"} size={22} color={goalMeta?.color ?? theme.accent} />
        </View>
        <View style={styles.goalTitleWrap}>
          <Text style={[styles.goalType, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
            {t(goal.type)}
          </Text>
          <Text style={[styles.goalValues, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
            {goal.current} {goalMeta?.unit} → {goal.target} {goalMeta?.unit}
          </Text>
        </View>
        {isAchieved ? (
          <Ionicons name="checkmark-circle" size={24} color={theme.success} />
        ) : (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDelete();
            }}
          >
            <Ionicons name="trash-outline" size={20} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: `${Math.round(progress * 100)}%` as any,
              backgroundColor: isAchieved ? theme.success : goalMeta?.color ?? theme.accent,
            },
          ]}
        />
      </View>

      <View style={styles.goalFooter}>
        <Text style={[styles.progressPct, { color: isAchieved ? theme.success : goalMeta?.color ?? theme.accent, fontFamily: "Outfit_700Bold" }]}>
          {Math.round(progress * 100)}%
        </Text>
        <Text style={[styles.goalStatus, { color: isAchieved ? theme.success : theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
          {isAchieved ? t("achieved") : t("inProgress")}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function GoalsScreen() {
  const { t } = useLanguage();
  const { goals, addGoal, deleteGoal } = useWorkout();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const [showAdd, setShowAdd] = useState(false);
  const [selectedType, setSelectedType] = useState<GoalType>("goalWeight");
  const [currentVal, setCurrentVal] = useState("");
  const [targetVal, setTargetVal] = useState("");

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const webBottomPadding = Platform.OS === "web" ? 34 : 0;

  const handleAdd = () => {
    const current = parseFloat(currentVal);
    const target = parseFloat(targetVal);
    if (isNaN(current) || isNaN(target)) return;
    const meta = GOAL_TYPES.find((g) => g.type === selectedType);
    addGoal({ type: selectedType, current, target, unit: meta?.unit ?? "" });
    setShowAdd(false);
    setCurrentVal("");
    setTargetVal("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    deleteGoal(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 16,
          paddingBottom: Platform.OS === "web" ? webBottomPadding + 100 : 100,
          paddingHorizontal: 20,
        }}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={[styles.title, { color: theme.text, fontFamily: "Outfit_800ExtraBold" }]}>
            {t("myGoals")}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowAdd(true);
            }}
            style={[styles.addBtn, { backgroundColor: theme.accent }]}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </Animated.View>

        {goals.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.emptyState}>
            <Ionicons name="flag-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
              {t("noGoalsYet")}
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
              {t("addFirstGoal")}
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.goalsList}>
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onDelete={() => handleDelete(goal.id)} />
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAdd(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
              {t("addGoal")}
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
              {t("objective")}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
              {GOAL_TYPES.map((gt) => (
                <Pressable
                  key={gt.type}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedType(gt.type);
                  }}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: selectedType === gt.type ? gt.color : theme.background,
                      borderColor: selectedType === gt.type ? gt.color : theme.border,
                    },
                  ]}
                >
                  <Ionicons name={gt.icon as any} size={16} color={selectedType === gt.type ? "#fff" : theme.textSecondary} />
                  <Text style={[styles.typeChipText, {
                    color: selectedType === gt.type ? "#fff" : theme.textSecondary,
                    fontFamily: "Outfit_600SemiBold",
                  }]}>
                    {t(gt.type)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
              {t("currentValue")}
            </Text>
            <TextInput
              value={currentVal}
              onChangeText={setCurrentVal}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: "Outfit_400Regular" }]}
            />

            <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
              {t("targetValue")}
            </Text>
            <TextInput
              value={targetVal}
              onChangeText={setTargetVal}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: "Outfit_400Regular" }]}
            />

            <Pressable
              onPress={handleAdd}
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.saveBtnText, { fontFamily: "Outfit_700Bold" }]}>{t("addGoal")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 32 },
  addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  goalsList: { gap: 14 },
  goalCard: { borderRadius: 16, padding: 16 },
  goalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  goalIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  goalTitleWrap: { flex: 1 },
  goalType: { fontSize: 15, marginBottom: 2 },
  goalValues: { fontSize: 13 },
  progressBg: { height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
  progressFill: { height: "100%", borderRadius: 4 },
  goalFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  progressPct: { fontSize: 16 },
  goalStatus: { fontSize: 12 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 14, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 22, marginBottom: 20 },
  fieldLabel: { fontSize: 13, marginBottom: 8, marginTop: 12 },
  typeRow: { marginBottom: 4 },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  typeChipText: { fontSize: 13 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 4,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  saveBtnText: { color: "#fff", fontSize: 16 },
});
