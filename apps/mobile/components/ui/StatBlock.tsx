import React from "react";
import { StyleProp, StyleSheet, Text, TextStyle, useColorScheme, View, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Card } from "@/components/ui/Card";
import { Typography } from "@/constants/typography";

interface StatBlockProps {
  value: string | number;
  label: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  color: string;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  compact?: boolean;
  variant?: "default" | "metric";
  valueStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function StatBlock({
  value,
  label,
  iconName,
  color,
  style,
  delay,
  compact = false,
  variant = "default",
  valueStyle,
  labelStyle,
}: StatBlockProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const content = (
    <Card style={[styles.card, compact && styles.compactCard, variant === "metric" && styles.metricCard, style]}>
      {variant !== "metric" && iconName ? (
        <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
          <Ionicons name={iconName} size={compact ? 16 : 20} color={color} />
        </View>
      ) : null}
      <Text
        style={[
          styles.value,
          compact ? styles.compactValue : null,
          variant === "metric" ? styles.metricValue : null,
          { color: theme.text, fontFamily: variant === "metric" ? Typography.titleStrong : Typography.title },
          valueStyle,
        ]}
      >
        {value}
      </Text>
      <Text
        style={[
          styles.label,
          compact ? styles.compactLabel : null,
          variant === "metric" ? styles.metricLabel : null,
          { color: theme.textSecondary, fontFamily: Typography.labelTech },
          labelStyle,
        ]}
      >
        {label}
      </Text>
    </Card>
  );

  if (typeof delay === "number") {
    return <Animated.View entering={FadeInDown.delay(delay).duration(360)}>{content}</Animated.View>;
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 6,
    padding: 14,
    borderLeftWidth: 1,
  },
  compactCard: {
    padding: 12,
    gap: 4,
  },
  metricCard: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 24,
    lineHeight: 26,
  },
  compactValue: {
    fontSize: 18,
    lineHeight: 20,
  },
  label: {
    fontSize: 10,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  compactLabel: {
    fontSize: 10,
    textTransform: "none",
    letterSpacing: 0,
  },
  metricValue: {
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: 0.5,
  },
  metricLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
});
