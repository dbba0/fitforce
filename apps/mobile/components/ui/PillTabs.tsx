import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, useColorScheme, View, ViewStyle } from "react-native";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";

export interface PillTabItem<T extends string> {
  key: T;
  label: string;
}

interface PillTabsProps<T extends string> {
  tabs: PillTabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function PillTabs<T extends string>({ tabs, active, onChange, style }: PillTabsProps<T>) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.row, style]}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: isActive ? theme.accent : theme.cardElevated,
                borderColor: isActive ? theme.accent : theme.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? "#fff" : theme.textSecondary,
                  fontFamily: Typography.bodySemiBold,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tab: {
    minHeight: 46,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 16,
  },
});
