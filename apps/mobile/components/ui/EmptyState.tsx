import React from "react";
import { StyleProp, StyleSheet, Text, useColorScheme, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { GhostButton } from "@/components/ui/GhostButton";
import { Typography } from "@/constants/typography";

interface EmptyStateProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  iconName = "cube-outline",
  title,
  description,
  actionLabel,
  onActionPress,
  style,
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name={iconName} size={24} color={theme.textMuted} />
      </View>
      <Text style={[styles.title, { color: theme.text, fontFamily: Typography.title }]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, { color: theme.textSecondary, fontFamily: Typography.bodyRegular }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onActionPress ? (
        <GhostButton label={actionLabel} onPress={onActionPress} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 40,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
