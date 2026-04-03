import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/hooks";
import { TranslationKey } from "@/lib/i18n";

type TabName = "index" | "workouts" | "track" | "feed" | "profile";

const TAB_CONFIG: Record<
  TabName,
  { labelKey: TranslationKey; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }
> = {
  index: { labelKey: "home", icon: "home-outline", activeIcon: "home" },
  workouts: { labelKey: "workouts", icon: "barbell-outline", activeIcon: "barbell" },
  track: { labelKey: "track", icon: "navigate-outline", activeIcon: "navigate" },
  feed: { labelKey: "feed", icon: "people-outline", activeIcon: "people" },
  profile: { labelKey: "profile", icon: "person-outline", activeIcon: "person" },
};

function TrackTabBarButton({
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
}: BottomTabBarButtonProps) {
  const focused = !!accessibilityState?.selected;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.trackFab,
        {
          opacity: pressed ? 0.88 : 1,
          transform: [{ translateY: -16 }, { scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Ionicons name={focused ? "navigate" : "navigate-outline"} size={32} color="#FFFFFF" />
    </Pressable>
  );
}

function FloatingTabIcon({
  focused,
  icon,
  activeIcon,
}: {
  focused: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}) {
  const { colors, radius } = useAppTheme();
  return (
    <View
      style={[
        styles.iconWrap,
        {
          borderRadius: radius.md,
          backgroundColor: focused ? `${colors.accent}22` : "transparent",
          borderColor: focused ? `${colors.accent}50` : "transparent",
        },
      ]}
    >
      <Ionicons
        name={focused ? activeIcon : icon}
        size={20}
        color={focused ? colors.accent : colors.textMuted}
      />
    </View>
  );
}

export default function TabLayout() {
  const { t } = useLanguage();
  const { colors, spacing, radius, typography, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: "absolute",
          left: isWeb ? 16 : spacing[2],
          right: isWeb ? 16 : spacing[2],
          bottom: 0,
          height: isWeb ? 68 : 68 + Math.max(insets.bottom - 6, 0),
          paddingTop: 8,
          paddingBottom: isWeb ? 8 : Math.max(insets.bottom, 8),
          paddingHorizontal: 8,
          borderRadius: radius.xl,
          borderTopWidth: 1,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          backgroundColor: "transparent",
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.34 : 0.14,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 0,
        },
        tabBarItemStyle: {
          borderRadius: radius.lg,
          marginHorizontal: 2,
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontFamily: typography.family.bodySemiBold,
          fontSize: 12,
          lineHeight: 14,
          marginTop: 2,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { borderRadius: radius.xl, overflow: "hidden" }]}>
            <BlurView
              intensity={72}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isDark ? "rgba(12,12,14,0.72)" : "rgba(250,250,252,0.8)",
                },
              ]}
            />
          </View>
        ),
      }}
    >
      {(Object.keys(TAB_CONFIG) as TabName[]).map((name) => {
        const cfg = TAB_CONFIG[name];
        if (name === "track") {
          return (
            <Tabs.Screen
              key={name}
              name={name}
              options={{
                title: t(cfg.labelKey),
                tabBarLabel: () => null,
                tabBarIcon: () => null,
                tabBarButton: (props) => <TrackTabBarButton {...props} />,
              }}
            />
          );
        }

        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: t(cfg.labelKey),
              tabBarIcon: ({ focused }) => (
                <FloatingTabIcon
                  focused={focused}
                  icon={cfg.icon}
                  activeIcon={cfg.activeIcon}
                />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  trackFab: {
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: "#FF5500",
    padding: 14,
    shadowColor: "#FF5500",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 9,
  },
});
