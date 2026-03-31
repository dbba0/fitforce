import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Badge, Card, SectionLabel } from "@/components/ui";
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
        <Badge label={progressLabel} variant="mint" />
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
  track: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
});
