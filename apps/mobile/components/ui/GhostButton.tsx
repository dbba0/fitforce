import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, useColorScheme, ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

interface GhostButtonProps {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function GhostButton({ label, onPress, style, textStyle }: GhostButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          borderColor: theme.border,
          opacity: pressed ? 0.78 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: theme.textSecondary, fontFamily: Typography.bodySemiBold }, textStyle]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 46,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  label: {
    fontSize: 15,
  },
});
