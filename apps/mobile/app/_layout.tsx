import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppLoader } from "@/components/ui";
import { queryClient } from "@/lib/query-client";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { WorkoutProvider, useWorkout } from "@/contexts/WorkoutContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthScreen from "@/app/auth";
import { syncRetentionNotifications } from "@/lib/retentionNotifications";
import { useFonts } from "expo-font";
import { Syne_700Bold, Syne_800ExtraBold } from "@expo-google-fonts/syne";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(secondary)" options={{ headerShown: false }} />
      <Stack.Screen
        name="exercise/[id]"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="program/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="session/[id]"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="session/completion"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="cardio/[id]"
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <Stack.Screen
        name="user/[id]"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
    </Stack>
  );
}

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AppLoader fullScreen />;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <RootLayoutNav />;
}

function RetentionNotificationsSync() {
  const { t } = useLanguage();
  const { sessions, streakDays, isLoaded } = useWorkout();

  useEffect(() => {
    if (!isLoaded) return;
    syncRetentionNotifications({
      sessions,
      streakDays,
      texts: {
        behavioralTitle: t("notifBehavioralTitle"),
        behavioralBody: t("notifBehavioralBody"),
        streakDangerTitle: t("notifStreakDangerTitle"),
        streakDangerBody: t("notifStreakDangerBody"),
        socialTitle: t("notifSocialTitle"),
        socialBody: t("notifSocialBody"),
      },
    }).catch(() => {});
  }, [isLoaded, sessions, streakDays, t]);

  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Syne_700Bold,
    Syne_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <WorkoutProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RetentionNotificationsSync />
                  <AuthGate />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </WorkoutProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
