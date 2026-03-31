import { useColorScheme } from "react-native";
import { resolveTheme } from "@/design";

export function useAppTheme() {
  const colorScheme = useColorScheme();
  const mode = colorScheme === "light" ? "light" : "dark";
  const theme = resolveTheme(mode);

  return {
    mode,
    isDark: mode === "dark",
    theme,
    colors: theme.colors,
    spacing: theme.spacing,
    layout: theme.layout,
    radius: theme.radius,
    typography: theme.typography,
    motion: theme.motion,
  };
}
