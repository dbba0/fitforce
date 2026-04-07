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

type TabName = "index" | "workouts" | "track" | "feed" | "nutrition" | "profile";

const TAB_CONFIG: Record<
  TabName,
  { labelKey: TranslationKey; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }
> = {
  index: { labelKey: "home", icon: "home-outline", activeIcon: "home" },
  workouts: { labelKey: "workouts", icon: "barbell-outline", activeIcon: "barbell" },
  track: { labelKey: "track", icon: "navigate-outline", activeIcon: "navigate" },
  feed: { labelKey: "feed", icon: "people-outline", activeIcon: "people" },
  nutrition: { labelKey: "nutrition" as TranslationKey, icon: "restaurant-outline", activeIcon: "restaurant" },
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
        tabBarActiveTintColor: "#FF5500",
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 85,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          ...(Platform.OS === "ios" ? { paddingBottom: 20 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          marginBottom: 6,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={60}
            tint="dark"
            style={{
              ...StyleSheet.absoluteFillObject,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.08)",
              backgroundColor: "rgba(10,10,10,0.55)",
              overflow: "hidden",
            }}
          />
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
