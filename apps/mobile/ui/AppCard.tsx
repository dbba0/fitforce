import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/hooks";

type CardVariant = "default" | "elevated" | "hero";
type CardHaptic = "none" | "light" | "medium";

interface AppCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  onPress?: () => void;
  borderLeftColor?: string;
  borderLeftWidth?: number;
  haptic?: CardHaptic;
  testID?: string;
}

export function AppCard({
  children,
  style,
  variant = "default",
  onPress,
  borderLeftColor,
  borderLeftWidth,
  haptic = "none",
  testID,
}: AppCardProps) {
  const { colors, radius, motion } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const computedBorderLeftWidth = borderLeftColor ? (borderLeftWidth ?? 3) : 1;
  const cardStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: variant === "elevated" ? colors.cardElevated : colors.card,
      borderColor: colors.border,
      borderLeftColor: borderLeftColor ?? colors.border,
      borderLeftWidth: computedBorderLeftWidth,
      borderRadius: variant === "hero" ? radius.lg : radius.md,
      padding: variant === "hero" ? 24 : 16,
    },
    style,
  ];

  if (!onPress) {
    return <View style={cardStyle}>{children}</View>;
  }

  return (
    <Pressable
      onPress={() => {
        if (haptic === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (haptic === "medium") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      testID={testID}
      onPressIn={() => {
        scale.value = withSpring(motion.easing.pressScale, motion.spring.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.snappy);
      }}
    >
      <Animated.View style={[cardStyle, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
});
