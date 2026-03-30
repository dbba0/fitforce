/**
 * Premium home screen palette (spec: dark #0D0D0F, violet accent).
 * Isolated from global app accent (orange) so other screens stay unchanged.
 */
export const HomePremium = {
  dark: {
    screenBg: "#0D0D0F",
    streakBadgeBg: "#1E1E28",
    accent: "#9333EA",
    accentSoft: "#C4B5FD",
    heroSurface: "#16131F",
    glow: "rgba(147, 51, 234, 0.32)",
    borderSubtle: "rgba(255, 255, 255, 0.1)",
    card: "#121214",
    textSecondary: "#9CA3AF",
    textMuted: "#6B7280",
  },
  light: {
    screenBg: "#F4F4F6",
    streakBadgeBg: "#E8E8ED",
    accent: "#7C3AED",
    accentSoft: "#6D28D9",
    heroSurface: "#FFFFFF",
    glow: "rgba(124, 58, 237, 0.14)",
    borderSubtle: "rgba(0, 0, 0, 0.1)",
    card: "#FFFFFF",
    textSecondary: "#4B5563",
    textMuted: "#9CA3AF",
  },
} as const;

/** Union of dark / light premium tokens (used by Home and shared UI pieces). */
export type HomePremiumPalette = (typeof HomePremium)[keyof typeof HomePremium];
