import React from "react";
import { StyleProp, StyleSheet, Text, useColorScheme, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

interface StatChipProps {
  value: string | number;
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function StatChip({ value, label, color, style }: StatChipProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const valueColor = color ?? theme.text;

  return (
    <View style={[styles.base, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      <Text style={[styles.value, { color: valueColor, fontFamily: Typography.titleStrong }]}>{value}</Text>
      <Text style={[styles.label, { color: theme.textMuted, fontFamily: Typography.labelTech }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: 108,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  value: {
    fontSize: 32,
    lineHeight: 32,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
});
