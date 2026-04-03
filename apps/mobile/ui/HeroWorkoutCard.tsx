import React, { useEffect } from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks";
import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { AppText } from "@/ui/AppText";

type HeroMetaItem = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

interface HeroWorkoutCardProps {
  title?: string;
  subtitle?: string;
  badgeLabel?: string;
  metaItems?: HeroMetaItem[];
  primaryCtaLabel: string;
  onPrimaryCtaPress?: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCtaPress?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyPrimaryCtaLabel?: string;
  onEmptyPrimaryCtaPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function MetaItem({ label, value, icon = "ellipse-outline" }: HeroMetaItem) {
  const { colors, radius } = useAppTheme();

  return (
    <View
      style={[
        styles.metaItem,
        {
          borderRadius: radius.md,
          borderColor: colors.border,
          backgroundColor: colors.cardElevated,
        },
      ]}
    >
      <View style={styles.metaLabelRow}>
        <Ionicons name={icon} size={12} color={colors.textMuted} />
        <AppText variant="labelTech" tone="muted">
          {label}
        </AppText>
      </View>
      <AppText variant="bodySemiBold" numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

export function HeroWorkoutCard({
  title,
  subtitle,
  badgeLabel,
  metaItems = [],
  primaryCtaLabel,
  onPrimaryCtaPress,
  secondaryCtaLabel,
  onSecondaryCtaPress,
  isEmpty = false,
  emptyTitle,
  emptySubtitle,
  emptyPrimaryCtaLabel,
  onEmptyPrimaryCtaPress,
  style,
}: HeroWorkoutCardProps) {
  const { colors, radius } = useAppTheme();
  const glowOpacity = useSharedValue(0.38);
  const displayEmptyState = isEmpty || !title;

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.7, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const resolvedTitle = displayEmptyState ? emptyTitle ?? title ?? "" : title ?? "";
  const resolvedSubtitle = displayEmptyState ? emptySubtitle ?? subtitle : subtitle;
  const resolvedPrimaryCtaLabel = displayEmptyState
    ? emptyPrimaryCtaLabel ?? primaryCtaLabel
    : primaryCtaLabel;
  const resolvedPrimaryAction = displayEmptyState ? onEmptyPrimaryCtaPress : onPrimaryCtaPress;

  return (
    <AppCard
      variant="hero"
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
      <Animated.View
        style={[styles.glow, glowStyle, { backgroundColor: `${colors.accent}1F` }]}
        pointerEvents="none"
      />

      {badgeLabel ? (
        <View
          style={[
            styles.badge,
            {
              borderRadius: radius.pill,
              borderColor: `${colors.accent}4A`,
              backgroundColor: `${colors.accent}20`,
            },
          ]}
        >
          <Ionicons name={displayEmptyState ? "sparkles-outline" : "flash"} size={13} color={colors.accent} />
          <AppText variant="labelTech" tone="accent">
            {badgeLabel}
          </AppText>
        </View>
      ) : null}

      <AppText variant="titleStrong" style={styles.title} numberOfLines={2}>
        {resolvedTitle}
      </AppText>
      {resolvedSubtitle ? (
        <AppText variant="bodyRegular" tone="secondary" style={styles.subtitle}>
          {resolvedSubtitle}
        </AppText>
      ) : null}

      {!displayEmptyState && metaItems.length > 0 ? (
        <View style={styles.metaRow}>
          {metaItems.slice(0, 3).map((item) => (
            <MetaItem key={`${item.label}-${item.value}`} {...item} />
          ))}
        </View>
      ) : null}

      <AppButton
        label={resolvedPrimaryCtaLabel}
        icon={displayEmptyState ? "add" : "play"}
        variant="primary"
        haptic="medium"
        onPress={resolvedPrimaryAction}
        style={styles.primaryBtn}
        textStyle={styles.primaryBtnText}
      />
      {!displayEmptyState && secondaryCtaLabel ? (
        <Pressable
          onPress={onSecondaryCtaPress}
          style={({ pressed }) => [
            styles.secondaryLinkWrap,
            { opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <AppText
            variant="bodySemiBold"
            style={[
              styles.secondaryLinkText,
              { color: "#A1A1AA", fontFamily: "DMSans_600SemiBold" },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {secondaryCtaLabel}
          </AppText>
        </Pressable>
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    gap: 12,
  },
  glow: {
    position: "absolute",
    top: -60,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  title: {
    marginTop: 2,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: -2,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
  },
  metaItem: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 4,
  },
  metaLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  primaryBtn: {
    marginTop: 6,
    height: 52,
    width: "100%",
    alignSelf: "stretch",
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    shadowColor: "#F55F2B",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0,
  },
  secondaryLinkWrap: {
    marginTop: 8,
    alignSelf: "center",
    justifyContent: "center",
  },
  secondaryLinkText: {
    fontSize: 13,
    lineHeight: 16,
    textAlign: "center",
  },
});

export type { HeroWorkoutCardProps, HeroMetaItem };
