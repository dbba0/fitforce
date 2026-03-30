import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, useColorScheme, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

export interface ProgramCardData {
  title: string;
  subtitle?: string;
  duration?: string | number;
  calories?: string | number;
  badge?: string;
  meta?: string;
}

interface ProgramCardProps {
  program: ProgramCardData;
  accentColor: string;
  lastSession?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ProgramCard({ program, accentColor, lastSession, onPress, style }: ProgramCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderLeftColor: accentColor,
          opacity: pressed ? 0.9 : 1,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.title, { color: theme.text, fontFamily: Typography.titleStrong }]} numberOfLines={1}>
          {program.title}
        </Text>
        {program.badge ? (
          <View style={[styles.badge, { backgroundColor: `${accentColor}20` }]}>
            <Text style={[styles.badgeText, { color: accentColor, fontFamily: Typography.labelTech }]}>
              {program.badge}
            </Text>
          </View>
        ) : null}
      </View>

      {program.subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textSecondary, fontFamily: Typography.body }]} numberOfLines={1}>
          {program.subtitle}
        </Text>
      ) : null}

      <View style={styles.metaRow}>
        {program.duration != null ? (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.metaText, { color: theme.textMuted, fontFamily: Typography.bodyRegular }]}>
              {program.duration}
            </Text>
          </View>
        ) : null}
        {program.calories != null ? (
          <View style={styles.metaItem}>
            <Ionicons name="flame-outline" size={14} color={theme.accent} />
            <Text style={[styles.metaText, { color: theme.textMuted, fontFamily: Typography.bodyRegular }]}>
              {program.calories}
            </Text>
          </View>
        ) : null}
        {lastSession ? (
          <Text style={[styles.lastSession, { color: theme.textMuted, fontFamily: Typography.bodyRegular }]} numberOfLines={1}>
            {lastSession}
          </Text>
        ) : null}
      </View>

      {program.meta ? (
        <Text style={[styles.footerMeta, { color: theme.textSecondary, fontFamily: Typography.bodyRegular }]} numberOfLines={1}>
          {program.meta}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 22,
    lineHeight: 24,
  },
  badge: {
    height: 24,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 14,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  lastSession: {
    fontSize: 13,
    flexShrink: 1,
  },
  footerMeta: {
    fontSize: 12,
  },
});
