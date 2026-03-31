import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Card, GhostButton, PrimaryButton, SectionLabel } from "@/components/ui";
import { useAppTheme } from "@/hooks";

interface ProfileProgramSpotlightProps {
  sectionTitle: string;
  title: string;
  subtitle: string;
  details?: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  onPrimaryPress: () => void;
  onSecondaryPress: () => void;
}

export function ProfileProgramSpotlight({
  sectionTitle,
  title,
  subtitle,
  details,
  primaryCtaLabel,
  secondaryCtaLabel,
  onPrimaryPress,
  onSecondaryPress,
}: ProfileProgramSpotlightProps) {
  const { colors, typography } = useAppTheme();

  return (
    <Card
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      borderLeftColor={colors.accent}
      borderLeftWidth={4}
    >
      <SectionLabel textStyle={styles.labelText}>{sectionTitle}</SectionLabel>

      <Text style={[styles.title, { color: colors.text, fontFamily: typography.family.title }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: typography.family.body }]} numberOfLines={2}>
        {subtitle}
      </Text>

      {details ? (
        <Text style={[styles.details, { color: colors.textMuted, fontFamily: typography.family.bodyRegular }]}>
          {details}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton label={primaryCtaLabel} onPress={onPrimaryPress} />
        <GhostButton label={secondaryCtaLabel} onPress={onSecondaryPress} />
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
  title: {
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 19,
  },
  details: {
    fontSize: 12,
  },
  actions: {
    marginTop: 6,
    gap: 8,
  },
});
