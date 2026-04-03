import React, { useEffect } from "react";
import { StyleProp, StyleSheet, Text, useColorScheme, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

export interface GoalCardData {
  title: string;
  current: number;
  target: number;
  unit?: string;
  progress?: number;
  statusLabel?: string;
}

interface GoalCardProps {
  goal: GoalCardData;
  color: string;
  style?: StyleProp<ViewStyle>;
}

function getProgress(goal: GoalCardData): number {
  if (typeof goal.progress === "number") {
    return Math.max(0, Math.min(1, goal.progress));
  }
  if (goal.target <= 0) return 0;
  return Math.max(0, Math.min(1, goal.current / goal.target));
}

export function GoalCard({ goal, color, style }: GoalCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const progress = getProgress(goal);
  const pct = Math.round(progress * 100);

  const progressValue = useSharedValue(progress);

  useEffect(() => {
    progressValue.value = withTiming(progress, { duration: 420 });
  }, [progress, progressValue]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressValue.value * 100)}%` as const,
  }));

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      <View style={styles.rowTop}>
        <Text style={[styles.title, { color: theme.text, fontFamily: Typography.bodySemiBold }]} numberOfLines={1}>
          {goal.title}
        </Text>
        <Text style={[styles.pct, { color, fontFamily: Typography.title }]}>{pct}%</Text>
      </View>

      <Text style={[styles.values, { color: theme.textSecondary, fontFamily: Typography.body }]}>
        {goal.current} {goal.unit ?? ""} / {goal.target} {goal.unit ?? ""}
      </Text>

      <View style={[styles.track, { backgroundColor: theme.cardElevated }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
      </View>

      <Text style={[styles.status, { color: theme.textMuted, fontFamily: Typography.labelTech }]}>
        {goal.statusLabel ?? ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
  },
  pct: {
    fontSize: 15,
  },
  values: {
    fontSize: 13,
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  status: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
