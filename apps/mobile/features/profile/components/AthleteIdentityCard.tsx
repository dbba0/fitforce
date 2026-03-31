import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Avatar, Badge, Card } from "@/components/ui";
import { useAppTheme } from "@/hooks";

interface AthleteIdentityCardProps {
  title: string;
  name: string;
  meta: string;
  modeLabel: string;
  objectiveLabel: string;
  streakLabel?: string;
}

export function AthleteIdentityCard({
  title,
  name,
  meta,
  modeLabel,
  objectiveLabel,
  streakLabel,
}: AthleteIdentityCardProps) {
  const { colors, typography } = useAppTheme();

  return (
    <Card
      variant="hero"
      style={[styles.card, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
      borderLeftColor={colors.accent}
      borderLeftWidth={4}
    >
      <Text style={[styles.cardLabel, { color: colors.textMuted, fontFamily: typography.family.labelTech }]}>
        {title}
      </Text>

      <View style={styles.identityRow}>
        <Avatar name={name} size={88} color={colors.accent} mode="tint" style={styles.avatar} />
        <View style={styles.identityMain}>
          <Text style={[styles.name, { color: colors.text, fontFamily: typography.family.titleStrong }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary, fontFamily: typography.family.body }]}>
            {meta}
          </Text>
          <View style={styles.badgesRow}>
            <Badge label={modeLabel} variant="ember" style={styles.modeBadge} />
            <Badge label={objectiveLabel} variant="sky" style={styles.objectiveBadge} />
            {streakLabel ? <Badge label={streakLabel} variant="gold" style={styles.streakBadge} /> : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  cardLabel: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    borderWidth: 2,
  },
  identityMain: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 26,
    lineHeight: 28,
    letterSpacing: -0.9,
  },
  meta: {
    fontSize: 14,
  },
  badgesRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modeBadge: {
    minHeight: 30,
    paddingHorizontal: 12,
  },
  objectiveBadge: {
    minHeight: 30,
    paddingHorizontal: 12,
  },
  streakBadge: {
    minHeight: 30,
    paddingHorizontal: 12,
  },
});
