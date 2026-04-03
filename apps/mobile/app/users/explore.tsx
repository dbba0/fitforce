import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/hooks";
import { Typography } from "@/constants/typography";

export default function ExploreUsersScreen() {
  const { t } = useLanguage();
  const { colors, layout } = useAppTheme();
  const insets = useSafeAreaInsets();
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === "web" ? webTopPadding + 18 : insets.top + 18,
          paddingHorizontal: Math.max(layout.screenPadding, 16),
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text, fontFamily: Typography.titleStrong }]}>
        {t("feedExplorePlaceholderTitle")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  title: {
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -0.8,
  },
});
