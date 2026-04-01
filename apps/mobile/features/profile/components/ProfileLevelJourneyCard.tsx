import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card, SectionLabel } from "@/components/ui";
import { useAppTheme } from "@/hooks";

interface ProfileLevelJourneyCardProps {
  sectionTitle: string;
  levelName: string;
  progress: number;
  progressLabel: string;
  subtitle: string;
}

export function ProfileLevelJourneyCard({
  sectionTitle,
  levelName,
  progress,
  progressLabel,
  subtitle,
}: ProfileLevelJourneyCardProps) {
  const { colors, typography } = useAppTheme();
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <Card style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SectionLabel textStyle={styles.labelText}>{sectionTitle}</SectionLabel>

      <View style={styles.topRow}>
        <Text style={[styles.level, { color: colors.text, fontFamily: typography.family.titleStrong }]}>
          {levelName}
        </Text>
        <View style={[styles.levelBadge, { borderColor: `${colors.accent}6B`, backgroundColor: "transparent" }]}>
          <Text style={[styles.levelBadgeText, { color: colors.accent, fontFamily: typography.family.labelTech }]}>
            {progressLabel}
          </Text>
        </View>
      </View>

      <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: typography.family.bodyRegular }]}>
        {subtitle}
      </Text>

      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%` as const,
              backgroundColor: colors.accent,
            },
          ]}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  labelText: {
    fontSize: 10,
    letterSpacing: 1.1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  level: {
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  levelBadge: {
    minHeight: 24,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  levelBadgeText: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  track: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
});
