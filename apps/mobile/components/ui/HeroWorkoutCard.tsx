import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GhostButton } from "@/components/ui/GhostButton";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { Typography } from "@/constants/typography";
import type { HomePremiumPalette } from "@/constants/homePremium";

interface HeroWorkoutCardProps {
  chipLabel: string;
  title: string;
  meta: string;
  primaryLabel: string;
  secondaryLabel: string;
  palette: HomePremiumPalette;
  textPrimary: string;
  onStart: () => void;
  onChooseOther: () => void;
}

export function HeroWorkoutCard({
  chipLabel,
  title,
  meta,
  primaryLabel,
  secondaryLabel,
  palette,
  textPrimary,
  onStart,
  onChooseOther,
}: HeroWorkoutCardProps) {
  const chipSurface: ViewStyle = {
    backgroundColor: `${palette.accent}22`,
    borderColor: `${palette.accent}44`,
  };

  return (
    <View style={[styles.card, { backgroundColor: palette.heroSurface, borderColor: palette.borderSubtle }]}>
      <View style={[styles.glow, { backgroundColor: palette.glow }]} pointerEvents="none" />

      <View style={[styles.chipRow, chipSurface]}>
        <Ionicons name="flash" size={14} color={palette.accentSoft} />
        <Text style={[styles.chipText, { color: palette.accentSoft, fontFamily: Typography.labelTech }]}>
          {chipLabel}
        </Text>
      </View>

      <Text style={[styles.title, { color: textPrimary, fontFamily: Typography.titleStrong }]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={[styles.meta, { color: palette.textSecondary, fontFamily: Typography.body }]}>{meta}</Text>

      <PrimaryButton
        label={primaryLabel}
        icon="play"
        onPress={onStart}
        style={[styles.primaryBtn, { backgroundColor: palette.accent }]}
        textStyle={styles.primaryBtnText}
      />

      <GhostButton
        label={secondaryLabel}
        onPress={onChooseOther}
        style={[styles.ghostBtn, { borderColor: palette.borderSubtle }]}
        textStyle={{ color: palette.textSecondary, fontFamily: Typography.bodySemiBold }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    overflow: "hidden",
    gap: 12,
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    right: -72,
    top: -36,
  },
  chipRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.6,
    marginTop: 4,
  },
  meta: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 999,
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 17,
  },
  ghostBtn: {
    height: 48,
    backgroundColor: "transparent",
  },
});
