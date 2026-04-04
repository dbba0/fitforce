import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import { useLanguage } from "@/contexts/LanguageContext";
import { getExerciseById } from "@/data/exercises";
import { Colors } from "@/constants/colors";
import ExerciseMedia from "@/components/ExerciseMedia";
import { apiRequest } from "@/lib/query-client";
import { PillTabs, PrimaryButton } from "@/components/ui";

type DetailTab = "muscle" | "tutorial";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MEDIA_HEIGHT = Math.max(220, Math.round(SCREEN_WIDTH * 0.62));

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Pectoraux",
  back: "Dos",
  shoulders: "Epaules",
  arms: "Bras",
  core: "Core",
  legs: "Jambes",
};

function secondsToClock(total: number) {
  const safe = Math.max(0, total);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<DetailTab>("muscle");
  const [freshVideoUrl, setFreshVideoUrl] = useState<string | null>(null);
  const [freshThumbnailUrl, setFreshThumbnailUrl] = useState<string | null>(null);

  const fetchExercise = useCallback(async (exerciseId: string) => {
    try {
      const res = await apiRequest("GET", `/api/exercises/${exerciseId}`);
      const payload = await res.json();
      const detail = payload.data ?? payload;
      if (detail.videoUrl) setFreshVideoUrl(detail.videoUrl);
      if (detail.thumbnailUrl) setFreshThumbnailUrl(detail.thumbnailUrl);
    } catch {
      // keep current display, no-op
    }
  }, []);

  const exercise = getExerciseById(id ?? "");
  const figureTheme = {
    card: theme.card,
    border: theme.border,
    text: theme.text,
    textSecondary: theme.textSecondary,
    accent: theme.accent,
  };

  const [durationSec, setDurationSec] = useState(() => (exercise ? Math.max(15, exercise.durationMin * 60) : 30));

  if (!exercise) {
    return (
      <View style={[styles.fallback, { backgroundColor: theme.background }]}> 
        <Text style={[styles.fallbackText, { color: theme.text, fontFamily: "Syne_700Bold" }]}>{t("errorLoading")}</Text>
        <Pressable onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: theme.accent }]}> 
          <Text style={[styles.closeBtnText, { fontFamily: "Syne_700Bold" }]}>{t("retry")}</Text>
        </Pressable>
      </View>
    );
  }

  const exT = exercise.translations[language as keyof typeof exercise.translations] ?? exercise.translations.en;
  const videoUrl = exercise.videoUrl;

  const instructionText = exT.steps.slice(0, 2).join(" ");
  const tutorialBullets = [...exT.steps.slice(0, 2), ...exT.tips.slice(0, 2)];
  const detailTabs: { key: DetailTab; label: string }[] = [
    { key: "muscle", label: "Muscle" },
    { key: "tutorial", label: "Tutoriel" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: Math.max(32, insets.bottom + 14) }}
      >
        <Animated.View entering={FadeInUp.duration(350)} style={[styles.sheet, { backgroundColor: "#17181D" }]}> 
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, { fontFamily: "Syne_800ExtraBold" }]}>{exT.name}</Text>
            <Pressable
              onPress={() => setActiveTab("tutorial")}
              style={({ pressed }) => [styles.notesBtn, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Text style={[styles.notesText, { fontFamily: "DMSans_500Medium" }]}>Remarques</Text>
            </Pressable>
          </View>

          <View style={styles.mediaCard}>
            {activeTab === "muscle" ? (
              <View style={styles.visualWrap}>
                {freshVideoUrl ?? videoUrl ? (
                  <Video
                    source={{ uri: (freshVideoUrl ?? videoUrl) as string }}
                    style={{ height: 240, borderRadius: 0 }}
                    resizeMode={ResizeMode.COVER}
                    useNativeControls
                    isLooping={false}
                    onError={() => {
                      fetchExercise(id ?? "");
                    }}
                  />
                ) : freshThumbnailUrl ?? exercise.imageUrl ? (
                  <Image
                    source={{ uri: (freshThumbnailUrl ?? exercise.imageUrl) as string }}
                    style={{ height: 240, width: "100%", borderRadius: 0 }}
                    resizeMode="cover"
                    onError={() => {
                      fetchExercise(id ?? "");
                    }}
                  />
                ) : (
                  <View style={{ height: 240, backgroundColor: "#1A1A1A", justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "#888", fontFamily: "DMSans_400Regular" }}>Vidéo non disponible</Text>
                  </View>
                )}
              </View>
            ) : null}

            {activeTab === "tutorial" ? (
              <View style={styles.tutorialCard}>
                {tutorialBullets.map((line, idx) => (
                  <View key={`${line}-${idx}`} style={styles.tutorialRow}>
                    <View style={styles.dot} />
                    <Text style={[styles.tutorialText, { fontFamily: "DMSans_400Regular" }]}>{line}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <PillTabs
            tabs={detailTabs}
            active={activeTab}
            onChange={(tab) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab(tab);
            }}
            style={styles.segmented}
          />


          <Animated.View entering={FadeInDown.duration(350).delay(80)} style={styles.durationRow}>
            <Text style={[styles.sectionTitle, styles.sectionBlue, { fontFamily: "Syne_800ExtraBold" }]}>DUREE (SECONDES)</Text>
            <View style={styles.counterRow}>
              <Pressable
                onPress={() => setDurationSec((s) => Math.max(15, s - 15))}
                style={({ pressed }) => [styles.roundCtl, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="remove" size={20} color="#FFFFFF" />
              </Pressable>

              <Text style={[styles.counterValue, { fontFamily: "Syne_800ExtraBold" }]}>{secondsToClock(durationSec)}</Text>

              <Pressable
                onPress={() => setDurationSec((s) => Math.min(7200, s + 15))}
                style={({ pressed }) => [styles.roundCtl, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(120)}>
            <Text style={[styles.sectionTitle, styles.sectionBlue, { fontFamily: "Syne_800ExtraBold" }]}>INSTRUCTION</Text>
            <Text style={[styles.paragraph, { fontFamily: "DMSans_400Regular" }]}>{instructionText}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(140)}>
            <Text style={[styles.sectionTitle, styles.sectionBlue, { fontFamily: "Syne_800ExtraBold" }]}>ZONE CIBLEE</Text>
            <View style={styles.zoneWrap}>
              {exercise.muscles.map((muscle) => (
                <View key={muscle} style={styles.zoneChip}>
                  <Text style={[styles.zoneChipText, { fontFamily: "Syne_700Bold" }]}>{MUSCLE_LABELS[muscle] ?? muscle}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <PrimaryButton label="Fermer" onPress={() => router.back()} style={styles.bottomClose} textStyle={styles.bottomCloseText} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fallback: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  fallbackText: { fontSize: 16, marginBottom: 12 },
  closeBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  closeBtnText: { color: "#fff", fontSize: 14 },

  sheet: {
    marginHorizontal: 14,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  handle: {
    alignSelf: "center",
    width: 64,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#2C2E37",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10,
  },
  title: {
    color: "#F3F5FA",
    fontSize: 36,
    lineHeight: 42,
    flex: 1,
  },
  notesBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  notesText: {
    color: "#9CA2B0",
    fontSize: 17,
    textDecorationLine: "underline",
  },

  mediaCard: {
    borderRadius: 20,
    backgroundColor: "#16181E",
    minHeight: MEDIA_HEIGHT,
    overflow: "hidden",
    marginBottom: 14,
  },
  visualWrap: {
    minHeight: MEDIA_HEIGHT,
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#121419",
  },
  stopBadge: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#F55F2B",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245,95,43,0.16)",
  },
  tutorialCard: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    minHeight: MEDIA_HEIGHT,
    justifyContent: "center",
  },
  tutorialRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 5,
    backgroundColor: "#F55F2B",
    marginTop: 7,
  },
  tutorialText: {
    flex: 1,
    color: "#1D2130",
    fontSize: 14,
    lineHeight: 21,
  },

  segmented: {
    marginBottom: 18,
  },
  demoLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  demoLinkText: {
    fontSize: 14,
  },

  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  sectionBlue: {
    color: "#F55F2B",
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roundCtl: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#3C3F48",
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    color: "#F8FAFC",
    fontSize: 34,
    minWidth: 128,
    textAlign: "center",
  },

  paragraph: {
    color: "#E6E9F0",
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 20,
  },

  zoneWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  zoneChip: {
    borderRadius: 12,
    backgroundColor: "rgba(245,95,43,0.16)",
    borderWidth: 1,
    borderColor: "rgba(245,95,43,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  zoneChipText: {
    color: "#F78C62",
    fontSize: 13,
  },

  bottomClose: {
    height: 58,
    borderRadius: 22,
  },
  bottomCloseText: {
    fontSize: 18,
    lineHeight: 20,
  },
});
