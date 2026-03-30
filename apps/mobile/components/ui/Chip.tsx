import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  useColorScheme,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  selectedColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Chip({
  label,
  selected = false,
  onPress,
  iconName,
  selectedColor,
  style,
  textStyle,
}: ChipProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const activeColor = selectedColor ?? theme.accent;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: selected ? activeColor : theme.card,
          borderColor: selected ? activeColor : theme.border,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {iconName ? (
        <Ionicons name={iconName} size={14} color={selected ? "#fff" : theme.textSecondary} />
      ) : null}
      <Text
        style={[
          styles.label,
          { color: selected ? "#fff" : theme.textSecondary, fontFamily: Typography.bodySemiBold },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
  },
});
