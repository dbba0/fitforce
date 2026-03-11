import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Linking,
  Platform,
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
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "@/contexts/LanguageContext";
import { getExerciseById } from "@/data/exercises";
import { Colors } from "@/constants/colors";
import ExerciseCoachFigure from "@/components/ExerciseCoachFigure";

type DetailTab = "video" | "muscle" | "tutorial";

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

const FIGURE_THEME = {
  card: "#F2F4F8",
  border: "#D8DCE7",
  text: "#1B1D25",
  textSecondary: "#616879",
  accent: "#266CFF",
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
  const [videoError, setVideoError] = useState(false);
  const [useInlineVideo, setUseInlineVideo] = useState(Platform.OS !== "ios");

  const exercise = getExerciseById(id ?? "");

  const [durationSec, setDurationSec] = useState(() => (exercise ? Math.max(15, exercise.durationMin * 60) : 30));

  if (!exercise) {
    return (
      <View style={[styles.fallback, { backgroundColor: theme.background }]}> 
        <Text style={[styles.fallbackText, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{t("errorLoading")}</Text>
        <Pressable onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: theme.accent }]}> 
          <Text style={[styles.closeBtnText, { fontFamily: "Outfit_700Bold" }]}>{t("retry")}</Text>
        </Pressable>
      </View>
    );
  }

  const exT = exercise.translations[language as keyof typeof exercise.translations] ?? exercise.translations.en;

  const instructionText = exT.steps.slice(0, 2).join(" ");
  const tutorialBullets = [...exT.steps.slice(0, 2), ...exT.tips.slice(0, 2)];
  const youtubeUrl = `https://www.youtube.com/watch?v=${exercise.youtubeId}`;
  const youtubeThumb = `https://img.youtube.com/vi/${exercise.youtubeId}/hqdefault.jpg`;

  const youtubeHtml = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; overflow: hidden; }
.video-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  height: 0;
}
.video-container iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}
</style>
</head>
<body>
<div class="video-container">
<iframe
  src="https://www.youtube.com/embed/${exercise.youtubeId}?autoplay=0&rel=0&showinfo=0&modestbranding=1&playsinline=1"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
></iframe>
</div>
</body>
</html>
`;

  const tabButton = (tab: DetailTab, label: string) => (
    <Pressable
      key={tab}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTab(tab);
      }}
      style={[styles.segmentBtn, activeTab === tab && styles.segmentBtnActive]}
    >
      <Text
        style={[
          styles.segmentText,
          {
            color: activeTab === tab ? "#FFFFFF" : "#9EA3AE",
            fontFamily: "Outfit_700Bold",
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <LinearGradient colors={["#0B1224", "#090A12"]} style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: Math.max(32, insets.bottom + 14) }}
      >
        <Animated.View entering={FadeInUp.duration(350)} style={[styles.sheet, { backgroundColor: "#17181D" }]}> 
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={[styles.title, { fontFamily: "Outfit_800ExtraBold" }]}>{exT.name}</Text>
            <Pressable
              onPress={() => setActiveTab("tutorial")}
              style={({ pressed }) => [styles.notesBtn, { opacity: pressed ? 0.75 : 1 }]}
            >
              <Text style={[styles.notesText, { fontFamily: "Outfit_500Medium" }]}>Remarques</Text>
            </Pressable>
          </View>

          <View style={styles.mediaCard}>
            {activeTab === "video" && useInlineVideo && !videoError ? (
              Platform.OS === "web" ? (
                <iframe
                  src={`https://www.youtube.com/embed/${exercise.youtubeId}?rel=0&modestbranding=1`}
                  style={{ width: "100%", height: MEDIA_HEIGHT, border: "none", borderRadius: 18 } as any}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <WebView
                  source={{ html: youtubeHtml }}
                  style={styles.webview}
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  onError={() => setVideoError(true)}
                  scrollEnabled={false}
                  bounces={false}
                  javaScriptEnabled
                  domStorageEnabled
                />
              )
            ) : null}

            {activeTab === "video" && (!useInlineVideo || videoError) ? (
              <View style={styles.videoFallback}>
                <Image source={{ uri: youtubeThumb }} style={styles.videoThumb} resizeMode="cover" />
                <View style={styles.videoOverlay}>
                  <Text style={[styles.videoFallbackTitle, { fontFamily: "Outfit_700Bold" }]}>Video</Text>
                  <Text style={[styles.videoFallbackText, { fontFamily: "Outfit_400Regular" }]}>Lecture integree indisponible.</Text>
                  <View style={styles.videoActions}>
                    <Pressable
                      onPress={() => Linking.openURL(youtubeUrl)}
                      style={({ pressed }) => [styles.videoActionBtn, { opacity: pressed ? 0.85 : 1 }]}
                    >
                      <Ionicons name="logo-youtube" size={18} color="#FF2D2D" />
                      <Text style={[styles.videoActionText, { fontFamily: "Outfit_700Bold" }]}>Regarder sur YouTube</Text>
                    </Pressable>
                    {!useInlineVideo && (
                      <Pressable
                        onPress={() => {
                          setVideoError(false);
                          setUseInlineVideo(true);
                        }}
                        style={({ pressed }) => [styles.videoInlineBtn, { opacity: pressed ? 0.85 : 1 }]}
                      >
                        <Text style={[styles.videoInlineText, { fontFamily: "Outfit_700Bold" }]}>Lire ici</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            ) : null}

            {activeTab === "muscle" ? (
              <View style={styles.visualWrap}>
                <ExerciseCoachFigure
                  muscles={exercise.muscles}
                  title="Vue musculaire"
                  subtitle={exT.description}
                  theme={FIGURE_THEME}
                  highlightColor={"#FF5E38"}
                />
                <View style={styles.stopBadge}>
                  <Ionicons name="stop" size={14} color="#3D63FF" />
                </View>
              </View>
            ) : null}

            {activeTab === "tutorial" || videoError ? (
              <View style={styles.tutorialCard}>
                {tutorialBullets.map((line, idx) => (
                  <View key={`${line}-${idx}`} style={styles.tutorialRow}>
                    <View style={styles.dot} />
                    <Text style={[styles.tutorialText, { fontFamily: "Outfit_400Regular" }]}>{line}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.segmented}>
            {tabButton("video", "Video")}
            {tabButton("muscle", "Muscle")}
            {tabButton("tutorial", "Tutoriel")}
          </View>

          <Animated.View entering={FadeInDown.duration(350).delay(80)} style={styles.durationRow}>
            <Text style={[styles.sectionTitle, styles.sectionBlue, { fontFamily: "Outfit_800ExtraBold" }]}>DUREE (SECONDES)</Text>
            <View style={styles.counterRow}>
              <Pressable
                onPress={() => setDurationSec((s) => Math.max(15, s - 15))}
                style={({ pressed }) => [styles.roundCtl, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="remove" size={20} color="#FFFFFF" />
              </Pressable>

              <Text style={[styles.counterValue, { fontFamily: "Outfit_800ExtraBold" }]}>{secondsToClock(durationSec)}</Text>

              <Pressable
                onPress={() => setDurationSec((s) => Math.min(7200, s + 15))}
                style={({ pressed }) => [styles.roundCtl, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(120)}>
            <Text style={[styles.sectionTitle, styles.sectionBlue, { fontFamily: "Outfit_800ExtraBold" }]}>INSTRUCTION</Text>
            <Text style={[styles.paragraph, { fontFamily: "Outfit_400Regular" }]}>{instructionText}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(140)}>
            <Text style={[styles.sectionTitle, styles.sectionBlue, { fontFamily: "Outfit_800ExtraBold" }]}>ZONE CIBLEE</Text>
            <View style={styles.zoneWrap}>
              {exercise.muscles.map((muscle) => (
                <View key={muscle} style={styles.zoneChip}>
                  <Text style={[styles.zoneChipText, { fontFamily: "Outfit_700Bold" }]}>{MUSCLE_LABELS[muscle] ?? muscle}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.bottomClose, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={[styles.bottomCloseText, { fontFamily: "Outfit_800ExtraBold" }]}>Fermer</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
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
    fontSize: 44,
    lineHeight: 52,
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
    backgroundColor: "#F3F4F6",
    minHeight: MEDIA_HEIGHT,
    overflow: "hidden",
    marginBottom: 14,
  },
  videoFallback: {
    minHeight: MEDIA_HEIGHT,
    position: "relative",
    backgroundColor: "#0B0D12",
  },
  videoThumb: {
    width: "100%",
    height: MEDIA_HEIGHT,
  },
  videoOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  videoFallbackTitle: { color: "#FFFFFF", fontSize: 18, marginBottom: 4 },
  videoFallbackText: { color: "#E2E8F0", fontSize: 12, marginBottom: 10 },
  videoActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  videoActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  videoActionText: { color: "#111827", fontSize: 12 },
  videoInlineBtn: {
    backgroundColor: "#0F5DFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  videoInlineText: { color: "#FFFFFF", fontSize: 12 },
  webview: {
    height: MEDIA_HEIGHT,
    backgroundColor: "#000",
  },
  visualWrap: {
    minHeight: MEDIA_HEIGHT,
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#F3F4F6",
  },
  stopBadge: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#5E7BFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF1FF",
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
    backgroundColor: "#266CFF",
    marginTop: 7,
  },
  tutorialText: {
    flex: 1,
    color: "#1D2130",
    fontSize: 14,
    lineHeight: 21,
  },

  segmented: {
    backgroundColor: "#23252F",
    borderRadius: 999,
    padding: 4,
    flexDirection: "row",
    marginBottom: 18,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    backgroundColor: "#0F5DFF",
  },
  segmentText: {
    fontSize: 17,
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
    color: "#0F66FF",
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
    fontSize: 40,
    minWidth: 128,
    textAlign: "center",
  },

  paragraph: {
    color: "#E6E9F0",
    fontSize: 17,
    lineHeight: 30,
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
    backgroundColor: "#10244B",
    borderWidth: 1,
    borderColor: "#2A5CB3",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  zoneChipText: {
    color: "#8DB6FF",
    fontSize: 13,
  },

  bottomClose: {
    backgroundColor: "#0B5DFF",
    borderRadius: 22,
    paddingVertical: 17,
    alignItems: "center",
  },
  bottomCloseText: {
    color: "#FFFFFF",
    fontSize: 34,
    lineHeight: 40,
  },
});
