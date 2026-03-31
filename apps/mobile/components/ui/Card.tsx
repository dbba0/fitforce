import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { AppCard } from "@/ui";

type CardVariant = "default" | "elevated" | "hero";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  onPress?: () => void;
  borderLeftColor?: string;
  borderLeftWidth?: number;
  testID?: string;
}

export function Card({
  children,
  style,
  variant = "default",
  onPress,
  borderLeftColor,
  borderLeftWidth,
  testID,
}: CardProps) {
  return (
    <AppCard
      variant={variant}
      style={style}
      onPress={onPress}
      haptic={onPress ? "light" : "none"}
      borderLeftColor={borderLeftColor}
      borderLeftWidth={borderLeftWidth}
      testID={testID}
    >
      {children}
    </AppCard>
  );
}
