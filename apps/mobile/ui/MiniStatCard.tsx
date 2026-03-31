import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks";
import { AppCard } from "@/ui/AppCard";
import { AppText } from "@/ui/AppText";

export type MiniStatTrend = "up" | "down" | "neutral";

export interface MiniStatCardData {
  id: string;
  title: string;
  value: string;
  delta?: string;
  helperText?: string;
  trend?: MiniStatTrend;
  indicatorValue?: number;
  accentColor?: string;
}

interface MiniStatCardProps extends MiniStatCardData {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function clamp01(value?: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.4;
  return Math.max(0, Math.min(1, value));
}

function trendIcon(trend: MiniStatTrend): keyof typeof Ionicons.glyphMap {
  if (trend === "up") return "trending-up";
  if (trend === "down") return "trending-down";
  return "remove";
}

export function MiniStatCard({
  title,
  value,
  delta,
  helperText,
  trend = "neutral",
  indicatorValue,
  accentColor,
  onPress,
  style,
}: MiniStatCardProps) {
  const { colors, radius, typography } = useAppTheme();
  const progress = clamp01(indicatorValue);
  const trendColor = trend === "up" ? colors.success : trend === "down" ? colors.error : colors.textMuted;
  const resolvedAccent = accentColor ?? (trend === "down" ? colors.error : colors.accent);

  return (
    <AppCard
      variant="default"
      onPress={onPress}
      haptic={onPress ? "light" : "none"}
      style={[
        styles.card,
        {
          borderRadius: radius.lg,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        style,
      ]}
    >
      <AppText variant="labelTech" tone="muted" numberOfLines={1}>
        {title}
      </AppText>

      <AppText
        variant="monoStat"
        numberOfLines={1}
        style={{ fontFamily: typography.family.display, fontSize: 32, lineHeight: 34 }}
      >
        {value}
      </AppText>

      <View style={styles.infoRow}>
        {delta ? (
          <View style={styles.deltaWrap}>
            <Ionicons name={trendIcon(trend)} size={12} color={trendColor} />
            <AppText
              variant="bodySemiBold"
              style={{ color: trendColor, fontSize: 13, lineHeight: 15 }}
              numberOfLines={1}
            >
              {delta}
            </AppText>
          </View>
        ) : (
          <View />
        )}
        {helperText ? (
          <AppText variant="bodyRegular" tone="secondary" style={styles.helperText} numberOfLines={1}>
            {helperText}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.indicatorTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.indicatorFill,
            {
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: resolvedAccent,
            },
          ]}
        />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 176,
    minHeight: 144,
    justifyContent: "space-between",
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 20,
  },
  deltaWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 14,
    textAlign: "right",
    flex: 1,
  },
  indicatorTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  indicatorFill: {
    height: "100%",
    borderRadius: 999,
  },
});
