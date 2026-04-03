import React from "react";
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

interface AppLoaderProps {
  label?: string;
  fullScreen?: boolean;
}

export function AppLoader({ label, fullScreen = true }: AppLoaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, fullScreen ? styles.fullScreen : null, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color={theme.accent} />
      {label ? (
        <Text style={[styles.label, { color: theme.textSecondary, fontFamily: Typography.body }]}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  fullScreen: {
    flex: 1,
  },
  label: {
    fontSize: 13,
  },
});
