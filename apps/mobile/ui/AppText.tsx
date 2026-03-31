import React from "react";
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from "react-native";
import { useAppTheme } from "@/hooks";

type AppTextVariant =
  | "display"
  | "titleStrong"
  | "title"
  | "body"
  | "bodyRegular"
  | "bodySemiBold"
  | "labelTech"
  | "monoStat";

type AppTextTone = "primary" | "secondary" | "muted" | "accent" | "success" | "warning";

interface AppTextProps extends TextProps {
  variant?: AppTextVariant;
  tone?: AppTextTone;
  style?: StyleProp<TextStyle>;
}

export function AppText({
  children,
  variant = "body",
  tone = "primary",
  style,
  ...rest
}: AppTextProps) {
  const { colors, typography } = useAppTheme();
  const variantStyle = variantStyles(typography)[variant];
  const color = toneColor(tone, colors);

  return (
    <Text {...rest} style={[styles.base, variantStyle, { color }, style]}>
      {children}
    </Text>
  );
}

function toneColor(tone: AppTextTone, colors: ReturnType<typeof useAppTheme>["colors"]) {
  if (tone === "secondary") return colors.textSecondary;
  if (tone === "muted") return colors.textMuted;
  if (tone === "accent") return colors.accent;
  if (tone === "success") return colors.success;
  if (tone === "warning") return colors.warning;
  return colors.text;
}

function variantStyles(typography: ReturnType<typeof useAppTheme>["typography"]) {
  return {
    display: {
      fontFamily: typography.family.display,
      fontSize: typography.size.display,
      lineHeight: Math.round(typography.size.display * typography.lineHeight.tight),
      letterSpacing: -1,
    },
    titleStrong: {
      fontFamily: typography.family.titleStrong,
      fontSize: typography.size.titleLg,
      lineHeight: Math.round(typography.size.titleLg * typography.lineHeight.tight),
      letterSpacing: -0.8,
    },
    title: {
      fontFamily: typography.family.title,
      fontSize: typography.size.titleMd,
      lineHeight: Math.round(typography.size.titleMd * typography.lineHeight.tight),
      letterSpacing: -0.4,
    },
    body: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodyMd,
      lineHeight: Math.round(typography.size.bodyMd * typography.lineHeight.body),
    },
    bodyRegular: {
      fontFamily: typography.family.bodyRegular,
      fontSize: typography.size.bodyMd,
      lineHeight: Math.round(typography.size.bodyMd * typography.lineHeight.body),
    },
    bodySemiBold: {
      fontFamily: typography.family.bodySemiBold,
      fontSize: typography.size.bodyMd,
      lineHeight: Math.round(typography.size.bodyMd * typography.lineHeight.body),
    },
    labelTech: {
      fontFamily: typography.family.labelTech,
      fontSize: typography.size.labelSm,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    monoStat: {
      fontFamily: typography.family.monoStat,
      fontSize: typography.size.titleMd,
      lineHeight: Math.round(typography.size.titleMd * typography.lineHeight.tight),
      letterSpacing: -0.2,
    },
  } as const;
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
