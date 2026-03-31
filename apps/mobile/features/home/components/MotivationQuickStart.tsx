import React from "react";
import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/hooks";
import { AppButton, AppCard, AppText } from "@/ui";

interface MotivationQuickStartProps {
  motivationLabel: string;
  motivationText: string;
  quickStartLabel: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

export function MotivationQuickStart({
  motivationLabel,
  motivationText,
  quickStartLabel,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
}: MotivationQuickStartProps) {
  const { colors, radius, spacing } = useAppTheme();

  return (
    <AppCard
      variant="elevated"
      style={[
        styles.card,
        {
          borderRadius: radius.lg,
          borderColor: colors.border,
          backgroundColor: colors.cardElevated,
          marginBottom: spacing[1],
        },
      ]}
    >
      <AppText variant="labelTech" tone="muted">
        {motivationLabel}
      </AppText>
      <AppText variant="title" style={styles.quote}>
        {motivationText}
      </AppText>

      <View style={styles.quickWrap}>
        <AppText variant="labelTech" tone="muted">
          {quickStartLabel}
        </AppText>
        <View style={styles.actionsRow}>
          <AppButton label={primaryActionLabel} onPress={onPrimaryAction} />
          <AppButton label={secondaryActionLabel} variant="ghost" onPress={onSecondaryAction} />
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  quote: {
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  quickWrap: {
    gap: 10,
    marginTop: 6,
  },
  actionsRow: {
    gap: 8,
  },
});
