import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

function NativeTabLayout() {
  const { t } = useLanguage();
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>{t("home")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="feed">
        <Icon sf={{ default: "heart", selected: "heart.fill" }} />
        <Label>{t("feed")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="workouts">
        <Icon sf={{ default: "figure.run", selected: "figure.run" }} />
        <Label>{t("workouts")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="builder">
        <Icon sf={{ default: "wrench.and.screwdriver", selected: "wrench.and.screwdriver.fill" }} />
        <Label>Builder</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="morphology">
        <Icon sf={{ default: "camera.viewfinder", selected: "camera.viewfinder" }} />
        <Label>Morpho IA</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="goals">
        <Icon sf={{ default: "target", selected: "target" }} />
        <Label>{t("goals")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>{t("profile")}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>{t("settings")}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  const { t } = useLanguage();
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: isDark ? "#555" : "#AAA",
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? "#0D0D0D" : "#F5F5F5",
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: isDark ? "#2A2A2A" : "#E5E5E5",
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? "#0D0D0D" : "#F5F5F5" },
              ]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: "Outfit_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: t("feed"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="people-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: t("workouts"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="barbell-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="goals"
        options={{
          title: t("goals"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="flag-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="builder"
        options={{
          title: "Builder",
          tabBarIcon: ({ color }) => (
            <Ionicons name="construct-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="morphology"
        options={{
          title: "Morpho IA",
          tabBarIcon: ({ color }) => (
            <Ionicons name="scan-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("profile"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("settings"),
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings-outline" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
