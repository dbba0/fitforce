import React from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useAppTheme } from "@/hooks";
import { Typography } from "@/constants/typography";

type ToastTone = "info" | "success" | "error";

interface FeedbackToastProps {
  message: string | null;
  tone?: ToastTone;
  style?: StyleProp<ViewStyle>;
}

export function FeedbackToast({ message, tone = "info", style }: FeedbackToastProps) {
  const { colors } = useAppTheme();
  if (!message) return null;

  const palette =
    tone === "error"
      ? { bg: `${colors.error}22`, text: colors.error, border: `${colors.error}55`, icon: "alert-circle-outline" as const }
      : tone === "success"
        ? { bg: `${colors.success}22`, text: colors.success, border: `${colors.success}55`, icon: "checkmark-circle-outline" as const }
        : { bg: `${colors.accent}22`, text: colors.accent, border: `${colors.accent}55`, icon: "information-circle-outline" as const };

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      style={[styles.wrap, style]}
      pointerEvents="none"
    >
      <View style={[styles.toast, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <Ionicons name={palette.icon} size={16} color={palette.text} />
        <Text style={[styles.label, { color: palette.text, fontFamily: Typography.bodySemiBold }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
  },
  toast: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
  },
});
