import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, useColorScheme, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

interface SectionLabelProps {
  children: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function SectionLabel({ children, action, onAction, style, textStyle }: SectionLabelProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.label, { color: theme.textMuted, fontFamily: Typography.labelTech }, textStyle]}>
        {children}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} style={({ pressed }) => [{ opacity: pressed ? 0.72 : 1 }]}>
          <Text style={[styles.action, { color: theme.accent, fontFamily: Typography.bodySemiBold }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  action: {
    fontSize: 12,
  },
});
