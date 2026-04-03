import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks";
import { AppText } from "@/ui";

interface ContextualHeaderProps {
  greetingLabel: string;
  firstName: string;
  contextMessage: string;
  streakDays: number;
  onQuickAction?: () => void;
}

export function ContextualHeader({
  greetingLabel,
  firstName,
  contextMessage,
  streakDays,
  onQuickAction,
}: ContextualHeaderProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  return (
    <View style={[styles.root, { marginBottom: spacing[3] }]}>
      <View style={styles.leftCol}>
        <AppText variant="labelTech" tone="accent">
          {greetingLabel}
        </AppText>
        <AppText
          variant="display"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.firstName,
            {
              color: "#FFFFFF",
              fontFamily: typography.family.titleStrong,
            },
          ]}
        >
          {firstName}
        </AppText>
        <AppText variant="bodyRegular" tone="secondary">
          {contextMessage}
        </AppText>
      </View>

      <View style={styles.rightCol}>
        <Pressable
          onPress={onQuickAction}
          style={({ pressed }) => [
            styles.iconShell,
            {
              width: 44,
              height: 44,
              borderRadius: radius.md,
              borderColor: colors.border,
              backgroundColor: colors.cardElevated,
              opacity: pressed ? 0.78 : 1,
            },
          ]}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
        </Pressable>

        <View
          style={[
            styles.streakPill,
            {
              borderRadius: radius.pill,
              backgroundColor: `${colors.accent}20`,
              borderColor: `${colors.accent}45`,
            },
          ]}
        >
          <Ionicons name="flame" size={14} color={colors.accent} />
          <AppText
            variant="bodySemiBold"
            style={{ fontFamily: typography.family.bodySemiBold, fontSize: 14 }}
          >
            {streakDays}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
    gap: 6,
  },
  rightCol: {
    alignItems: "flex-end",
    flexShrink: 0,
    gap: 10,
  },
  firstName: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
  },
  iconShell: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
