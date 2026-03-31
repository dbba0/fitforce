import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppIconButton } from "@/ui";

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, onPress, size = 36, style }: IconButtonProps) {
  return (
    <AppIconButton
      icon={icon}
      onPress={onPress}
      size={size}
      haptic="light"
      style={style}
    />
  );
}
