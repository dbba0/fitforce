import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppTheme } from "@/hooks";

type StateCardVariant = "empty" | "error";

interface StateCardProps {
  title: string;
  description?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onActionPress?: () => void;
  variant?: StateCardVariant;
  style?: StyleProp<ViewStyle>;
}

export function StateCard({
  title,
  description,
  iconName,
  actionLabel,
  onActionPress,
  variant = "empty",
  style,
}: StateCardProps) {
  const { colors } = useAppTheme();
  const fallbackIcon = variant === "error" ? "alert-circle-outline" : "sparkles-outline";
  const accent = variant === "error" ? colors.error : colors.accent;

  return (
    <Card
      style={[{ backgroundColor: colors.card, borderColor: colors.border }, style]}
      borderLeftColor={accent}
      borderLeftWidth={3}
    >
      <EmptyState
        iconName={iconName ?? fallbackIcon}
        title={title}
        description={description}
        actionLabel={actionLabel}
        onActionPress={onActionPress}
      />
    </Card>
  );
}
