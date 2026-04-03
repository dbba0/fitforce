import React, { useEffect } from "react";
import { StyleProp, StyleSheet, useColorScheme, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";

interface SkeletonCardProps {
  lines?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonCard({ lines = 3, height = 120, style }: SkeletonCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        styles.card,
        {
          height,
          backgroundColor: theme.cardElevated,
          borderColor: theme.border,
        },
        pulseStyle,
        style,
      ]}
    >
      {Array.from({ length: lines }).map((_, index) => (
        <View
          key={`skeleton-line-${index}`}
          style={[
            styles.line,
            {
              backgroundColor: theme.border,
              width: index === lines - 1 ? "52%" : "100%",
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    justifyContent: "center",
  },
  line: {
    height: 12,
    borderRadius: 6,
  },
});
