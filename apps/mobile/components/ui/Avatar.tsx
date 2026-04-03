import React from "react";
import {
  Image,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  useColorScheme,
  View,
  ViewStyle,
} from "react-native";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

type AvatarMode = "solid" | "tint";

interface AvatarProps {
  name?: string;
  initials?: string;
  size?: number;
  color?: string;
  mode?: AvatarMode;
  imageUri?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Avatar({
  name,
  initials,
  size = 40,
  color,
  mode = "tint",
  imageUri,
  onPress,
  style,
  textStyle,
}: AvatarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const accent = color ?? theme.accent;
  const fallbackInitials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const computedInitials = (initials || fallbackInitials || "?").slice(0, 2).toUpperCase();

  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: mode === "solid" ? accent : `${accent}20`,
      borderColor: mode === "solid" ? accent : `${accent}55`,
    },
    style,
  ];

  const textColor = mode === "solid" ? "#fff" : accent;
  const label = imageUri ? (
    <Image source={{ uri: imageUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <Text
      style={[
        {
          color: textColor,
          fontSize: Math.max(12, Math.round(size * 0.34)),
          fontFamily: Typography.titleStrong,
        },
        textStyle,
      ]}
    >
      {computedInitials}
    </Text>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        <View style={containerStyle}>{label}</View>
      </Pressable>
    );
  }

  return <View style={containerStyle}>{label}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
