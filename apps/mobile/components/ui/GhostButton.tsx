import React from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";
import { AppButton } from "@/ui";

interface GhostButtonProps {
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function GhostButton({ label, onPress, style, textStyle }: GhostButtonProps) {
  return (
    <AppButton
      label={label}
      variant="ghost"
      onPress={onPress}
      haptic="light"
      style={style}
      textStyle={textStyle}
    />
  );
}
