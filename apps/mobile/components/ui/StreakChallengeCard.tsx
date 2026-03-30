import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Typography } from "@/constants/typography";
import type { HomePremiumPalette } from "@/constants/homePremium";

export type WeekSlotState = "done" | "today" | "todo";

interface StreakChallengeCardProps {
  streakTitle: string;
  challengeActionLabel: string;
  progressLine: string;
  progress: number;
  slots: WeekSlotState[];
  todayMark: string;
  palette: HomePremiumPalette;
  textPrimary: string;
  onChallengePress: () => void;
}

export function StreakChallengeCard({
  streakTitle,
  challengeActionLabel,
  progressLine,
  progress,
  slots,
  todayMark,
  palette,
  textPrimary,
  onChallengePress,
}: StreakChallengeCardProps) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.borderSubtle,
          borderLeftColor: palette.accent,
        },
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.streakTitle, { color: textPrimary, fontFamily: Typography.title }]} numberOfLines={1}>
          {streakTitle}
        </Text>
        <Pressable
          onPress={onChallengePress}
          hitSlop={10}
          style={({ pressed }) => [styles.challengeCta, { opacity: pressed ? 0.75 : 1 }]}
        >
          <Text style={[styles.challengeCtaText, { color: palette.accent, fontFamily: Typography.bodySemiBold }]}>
            {challengeActionLabel}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.subLine, { color: palette.textSecondary, fontFamily: Typography.body }]}>
        {progressLine}
      </Text>

      <View style={[styles.track, { backgroundColor: `${palette.borderSubtle}` }]}>
        <View style={[styles.fill, { width: `${pct}%` as const, backgroundColor: palette.accent }]} />
      </View>

      <View style={styles.slotsRow}>
        {slots.map((state, index) => {
          const key = `slot-${index}`;
          if (state === "done") {
            return (
              <View
                key={key}
                style={[styles.slot, styles.slotDone, { backgroundColor: palette.accent, borderColor: palette.accent }]}
              >
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
            );
          }
          if (state === "today") {
            return (
              <View
                key={key}
                style={[
                  styles.slot,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.accent,
                    borderWidth: 2,
                  },
                ]}
              >
                <Text style={[styles.slotTodayText, { color: palette.accent, fontFamily: Typography.titleStrong }]}>
                  {todayMark}
                </Text>
              </View>
            );
          }
          return (
            <View
              key={key}
              style={[styles.slot, { backgroundColor: palette.card, borderColor: palette.borderSubtle }]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 16,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  streakTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
  },
  challengeCta: {
    paddingVertical: 4,
    paddingLeft: 8,
  },
  challengeCtaText: {
    fontSize: 14,
  },
  subLine: {
    fontSize: 14,
    lineHeight: 18,
  },
  track: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  slotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 2,
  },
  slot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  slotDone: {},
  slotTodayText: {
    fontSize: 12,
    lineHeight: 14,
  },
});
