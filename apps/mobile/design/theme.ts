import { AppColors, semanticColors } from "./colors";
import { layout, spacing } from "./spacing";
import { radius } from "./radius";
import { fontFamily, fontSize, lineHeight } from "./typography";
import { motion } from "./motion";

export type ThemeMode = "dark" | "light";

export type AppTheme = {
  mode: ThemeMode;
  colors: AppColors;
  spacing: typeof spacing;
  layout: typeof layout;
  radius: typeof radius;
  typography: {
    family: typeof fontFamily;
    size: typeof fontSize;
    lineHeight: typeof lineHeight;
  };
  motion: typeof motion;
};

export const themes: Record<ThemeMode, AppTheme> = {
  dark: {
    mode: "dark",
    colors: semanticColors.dark,
    spacing,
    layout,
    radius,
    typography: {
      family: fontFamily,
      size: fontSize,
      lineHeight,
    },
    motion,
  },
  light: {
    mode: "light",
    colors: semanticColors.light,
    spacing,
    layout,
    radius,
    typography: {
      family: fontFamily,
      size: fontSize,
      lineHeight,
    },
    motion,
  },
};

export function resolveTheme(mode?: string | null): AppTheme {
  return mode === "light" ? themes.light : themes.dark;
}
