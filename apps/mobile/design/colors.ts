export const colorPalette = {
  neutral: {
    0: "#000000",
    50: "#080808",
    100: "#101113",
    200: "#16181C",
    300: "#1D2025",
    400: "#262B33",
    500: "#7E8794",
    600: "#A9B0BA",
    700: "#D2D7DE",
    800: "#E8EBEF",
    900: "#F6F8FA",
  },
  ember: {
    400: "#FF8C5A",
    500: "#F55F2B",
    600: "#D94E1D",
    700: "#B74217",
  },
  mint: {
    500: "#2DD4A0",
  },
  sky: {
    500: "#5EA8FF",
  },
  gold: {
    500: "#F5C842",
  },
  danger: {
    500: "#FF4D4D",
  },
} as const;

export type AppColors = {
  background: string;
  card: string;
  cardElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  success: string;
  warning: string;
  error: string;
  tabBar: string;
  overlay: string;
  focusRing: string;
};

export const semanticColors: { dark: AppColors; light: AppColors } = {
  dark: {
    background: colorPalette.neutral[50],
    card: colorPalette.neutral[200],
    cardElevated: colorPalette.neutral[300],
    border: colorPalette.neutral[400],
    text: colorPalette.neutral[900],
    textSecondary: "#A1A1AA",
    textMuted: "#A1A1AA",
    accent: colorPalette.ember[500],
    accentDark: colorPalette.ember[700],
    accentLight: colorPalette.ember[400],
    success: colorPalette.mint[500],
    warning: colorPalette.gold[500],
    error: colorPalette.danger[500],
    tabBar: "rgba(8,8,8,0.95)",
    overlay: "rgba(0,0,0,0.56)",
    focusRing: "rgba(245,95,43,0.42)",
  },
  light: {
    background: "#F5F5F5",
    card: "#FFFFFF",
    cardElevated: "#FAFAFA",
    border: "#E5E7EB",
    text: "#0F1115",
    textSecondary: "#555C66",
    textMuted: "#8B949E",
    accent: colorPalette.ember[500],
    accentDark: colorPalette.ember[700],
    accentLight: colorPalette.ember[400],
    success: "#26B286",
    warning: "#D59E00",
    error: colorPalette.danger[500],
    tabBar: "rgba(245,245,245,0.95)",
    overlay: "rgba(0,0,0,0.38)",
    focusRing: "rgba(245,95,43,0.35)",
  },
};
