import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Typography } from "@/constants/typography";
import type { HomePremiumPalette } from "@/constants/homePremium";

interface CompactStatCardProps {
  label: string;
  value: string;
  palette: HomePremiumPalette;
  valueAccent: boolean;
  textPrimary: string;
  style?: StyleProp<ViewStyle>;
}

export function CompactStatCard({
  label,
  value,
  palette,
  valueAccent,
  textPrimary,
  style,
}: CompactStatCardProps) {
  const valueColor = valueAccent ? palette.accent : textPrimary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.borderSubtle,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: palette.textMuted, fontFamily: Typography.labelTech }]}>{label}</Text>
      <Text style={[styles.value, { color: valueColor, fontFamily: Typography.titleStrong }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    textAlign: "center",
  },
  value: {
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    textAlign: "center",
  },
});
