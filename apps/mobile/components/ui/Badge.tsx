import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Typography } from "@/constants/typography";

type BadgeVariant = "ember" | "mint" | "gold" | "sky";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: StyleProp<ViewStyle>;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  ember: { bg: "rgba(245,95,43,0.18)", text: "#F55F2B" },
  mint: { bg: "rgba(45,212,160,0.18)", text: "#2DD4A0" },
  gold: { bg: "rgba(245,200,66,0.18)", text: "#F5C842" },
  sky: { bg: "rgba(94,168,255,0.18)", text: "#5EA8FF" },
};

export function Badge({ label, variant = "ember", style }: BadgeProps) {
  const palette = VARIANT_STYLES[variant];

  return (
    <View style={[styles.base, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.label, { color: palette.text, fontFamily: Typography.labelTech }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 20,
    minWidth: 56,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
