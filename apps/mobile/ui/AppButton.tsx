import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks";

type ButtonVariant = "primary" | "ghost";
type ButtonHaptic = "none" | "light" | "medium" | "success";

interface AppButtonProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: ButtonVariant;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  haptic?: ButtonHaptic;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function AppButton({
  label,
  icon,
  variant = "primary",
  onPress,
  loading = false,
  disabled = false,
  haptic = "light",
  style,
  textStyle,
}: AppButtonProps) {
  const { colors, radius, typography, motion } = useAppTheme();
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (isDisabled) return;
    if (haptic === "light") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (haptic === "medium") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (haptic === "success") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onPress?.();
  };

  const isGhost = variant === "ghost";

  return (
    <Pressable
      disabled={isDisabled}
      onPress={handlePress}
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
            height: isGhost ? 46 : 54,
            borderRadius: radius.pill,
            backgroundColor: isGhost ? "transparent" : colors.accent,
            borderWidth: isGhost ? 1 : 0,
            borderColor: isGhost ? colors.border : "transparent",
            opacity: isDisabled ? 0.6 : 1,
          },
          animatedStyle,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={isGhost ? colors.textSecondary : "#FFFFFF"} />
        ) : (
          <View style={styles.content}>
            {icon ? (
              <Ionicons
                name={icon}
                size={18}
                color={isGhost ? colors.textSecondary : "#FFFFFF"}
              />
            ) : null}
            <Text
              style={[
                styles.label,
                {
                  color: isGhost ? colors.textSecondary : "#FFFFFF",
                  fontFamily: isGhost ? typography.family.bodySemiBold : typography.family.bodyBold,
                },
                textStyle,
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontSize: 17,
    letterSpacing: 0.1,
  },
});
