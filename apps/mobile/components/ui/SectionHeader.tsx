import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, useColorScheme, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onActionPress?: () => void;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  actionStyle?: StyleProp<TextStyle>;
}

export function SectionHeader({
  title,
  actionLabel,
  onActionPress,
  style,
  titleStyle,
  actionStyle,
}: SectionHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.row, style]}>
      <Text style={[styles.title, { color: theme.text, fontFamily: Typography.title }, titleStyle]}>{title}</Text>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.action, { color: theme.accent, fontFamily: Typography.bodySemiBold }, actionStyle]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
  },
  action: {
    fontSize: 13,
  },
});
