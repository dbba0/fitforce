import React from "react";
import { Pressable, StyleProp, StyleSheet, useColorScheme, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, onPress, size = 36, style }: IconButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size / 2.2),
          backgroundColor: theme.cardElevated,
          opacity: pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.52)} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
});
