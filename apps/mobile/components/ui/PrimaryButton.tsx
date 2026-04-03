import React from "react";
import { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppButton } from "@/ui";

interface PrimaryButtonProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
}: PrimaryButtonProps) {
  return (
    <AppButton
      label={label}
      icon={icon}
      variant="primary"
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      haptic="light"
      style={style}
      textStyle={textStyle}
    />
  );
}
