import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  useColorScheme,
  View,
  ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Colors } from "@/constants/colors";

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const computedBorderLeftWidth = borderLeftColor ? (borderLeftWidth ?? 3) : 1;
  const cardStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: variant === "elevated" ? theme.cardElevated : theme.card,
      borderColor: theme.border,
      borderLeftColor: borderLeftColor ?? theme.border,
      borderLeftWidth: computedBorderLeftWidth,
      borderRadius: variant === "hero" ? 24 : 16,
      padding: variant === "hero" ? 20 : 16,
    },
    style,
  ];

  if (!onPress) {
    return <View style={cardStyle}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 320 });
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
