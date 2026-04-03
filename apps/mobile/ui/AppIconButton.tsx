import React from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks";

type IconButtonHaptic = "none" | "light";

interface AppIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  haptic?: IconButtonHaptic;
  style?: StyleProp<ViewStyle>;
}

export function AppIconButton({
  icon,
  onPress,
  size = 36,
  haptic = "light",
  style,
}: AppIconButtonProps) {
  const { colors, motion } = useAppTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        if (haptic === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.();
      }}
      onPressIn={() => {
        scale.value = withSpring(motion.easing.pressScale, motion.spring.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.snappy);
      }}
    >
      <Animated.View
        style={[
          styles.base,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size / 2.2),
            backgroundColor: colors.cardElevated,
            borderColor: colors.border,
          },
          animatedStyle,
          style,
        ]}
      >
        <Ionicons name={icon} size={Math.round(size * 0.52)} color={colors.textSecondary} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
