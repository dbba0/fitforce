import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { useLanguage } from "@/contexts/LanguageContext";
import { getExerciseById } from "@/data/exercises";
import { Colors } from "@/constants/colors";

type DetailTab = "instructions" | "tips" | "mistakes";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIDEO_HEIGHT = Math.round(SCREEN_WIDTH * 9 / 16);

function MuscleChip({ muscle, color }: { muscle: string; color: string }) {
  const { t } = useLanguage();
  return (
    <View style={[styles.chip, { backgroundColor: color + "20", borderColor: color + "40" }]}>
      <Text style={[styles.chipText, { color, fontFamily: "Outfit_500Medium" }]}>{t((muscle === "back" ? "backMuscle" : muscle) as any)}</Text>
    </View>
  );
}

function StepItem({ number, text, total, color }: { number: number; text: string; total: number; color: string }) {
  const colorScheme = useColorScheme();
  return (
    <Animated.View entering={FadeInDown.delay(number * 60).duration(350)} style={styles.stepRow}>
      <View style={[styles.stepNumber, { backgroundColor: color }]}>
        <Text style={[styles.stepNumberText, { fontFamily: "Outfit_700Bold" }]}>{number}</Text>
      </View>
      <Text style={[styles.stepText, { color: (colorScheme === "dark" ? Colors.dark : Colors.light).text, fontFamily: "Outfit_400Regular" }]}>{text}</Text>
    </Animated.View>
  );
}

function TipItem({ text, icon, color }: { text: string; icon: string; color: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.tipRow, { backgroundColor: color + "10" }]}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[styles.tipText, { color: theme.text, fontFamily: "Outfit_400Regular" }]}>{text}</Text>
    </View>
  );
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<DetailTab>("instructions");
  const [videoError, setVideoError] = useState(false);

  const exercise = getExerciseById(id ?? "");

  if (!exercise) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={[styles.errorText, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>{t("errorLoading")}</Text>
        <Pressable onPress={() => router.back()} style={[styles.retryBtn, { backgroundColor: theme.accent }]}>
          <Text style={[styles.retryText, { fontFamily: "Outfit_600SemiBold" }]}>{t("retry")}</Text>
        </Pressable>
      </View>
    );
  }

  const exT = exercise.translations[language as keyof typeof exercise.translations] ?? exercise.translations.en;
  const MUSCLE_COLORS: Record<string, string> = {
    chest: "#FF6B2C",
    back: "#4CAF7D",
    shoulders: "#2196F3",
    arms: "#9C27B0",
    core: "#6C63FF",
    legs: "#E91E8C",
  };

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
  overflow: hidden;
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

  const difficultyColor = exercise.difficulty === "beginner"
    ? theme.success
    : exercise.difficulty === "intermediate"
    ? theme.warning
    : theme.error;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={[styles.videoContainer, { backgroundColor: "#000" }]}>
          {!videoError ? (
            <>
              {Platform.OS !== "web" ? (
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
              ) : (
                <iframe
                  src={`https://www.youtube.com/embed/${exercise.youtubeId}?rel=0&modestbranding=1`}
                  style={{ width: "100%", height: VIDEO_HEIGHT, border: "none" } as any}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </>
          ) : (
            <View style={[styles.videoPlaceholder, { height: VIDEO_HEIGHT }]}>
              <MaterialCommunityIcons name="video-off-outline" size={40} color="#555" />
              <Text style={[styles.noVideoText, { fontFamily: "Outfit_500Medium" }]}>{t("noVideo")}</Text>
            </View>
          )}

          <Animated.View
            entering={FadeInUp.duration(300)}
            style={[styles.backBtn, { top: insets.top + 8, backgroundColor: "rgba(0,0,0,0.6)" }]}
          >
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              hitSlop={12}
            >
              <Ionicons name="chevron-down" size={24} color="#fff" />
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.exHeader}>
            <View>
              <Text style={[styles.exName, { color: theme.text, fontFamily: "Outfit_800ExtraBold" }]}>
                {exT.name}
              </Text>
              <Text style={[styles.exDescription, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                {exT.description}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.metaRow}>
            <View style={[styles.metaCard, { backgroundColor: theme.card }]}>
              <Ionicons name="time-outline" size={18} color={theme.accent} />
              <Text style={[styles.metaValue, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{exercise.durationMin}</Text>
              <Text style={[styles.metaUnit, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>{t("minutes")}</Text>
            </View>
            <View style={[styles.metaCard, { backgroundColor: theme.card }]}>
              <Ionicons name="flame-outline" size={18} color={theme.warning} />
              <Text style={[styles.metaValue, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{exercise.calories}</Text>
              <Text style={[styles.metaUnit, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>{t("kcal")}</Text>
            </View>
            <View style={[styles.metaCard, { backgroundColor: theme.card }]}>
              <Ionicons name="barbell-outline" size={18} color={difficultyColor} />
              <Text style={[styles.metaValue, { color: difficultyColor, fontFamily: "Outfit_700Bold" }]} numberOfLines={1}>
                {t(exercise.difficulty)}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.musclesSection}>
            <Text style={[styles.sectionLabel, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
              {t("musclesWorked")}
            </Text>
            <View style={styles.muscleChips}>
              {exercise.muscles.map((m) => (
                <MuscleChip key={m} muscle={m} color={MUSCLE_COLORS[m] ?? theme.accent} />
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).duration(400)} style={[styles.tabBar, { backgroundColor: theme.card }]}>
            {(["instructions", "tips", "mistakes"] as DetailTab[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab);
                }}
                style={[
                  styles.tab,
                  activeTab === tab && [styles.tabActive, { backgroundColor: theme.accent }],
                ]}
              >
                <Text style={[
                  styles.tabText,
                  {
                    color: activeTab === tab ? "#fff" : theme.textSecondary,
                    fontFamily: "Outfit_600SemiBold",
                  },
                ]}>
                  {t(tab as any)}
                </Text>
              </Pressable>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.tabContent}>
            {activeTab === "instructions" && (
              <View style={styles.stepsList}>
                {exT.steps.map((step, i) => (
                  <StepItem
                    key={i}
                    number={i + 1}
                    text={step}
                    total={exT.steps.length}
                    color={exercise.imageColor}
                  />
                ))}
              </View>
            )}

            {activeTab === "tips" && (
              <View style={styles.tipsList}>
                {exT.tips.map((tip, i) => (
                  <TipItem
                    key={i}
                    text={tip}
                    icon="checkmark-circle-outline"
                    color="#4CAF7D"
                  />
                ))}
              </View>
            )}

            {activeTab === "mistakes" && (
              <View style={styles.tipsList}>
                {exT.mistakes.map((mistake, i) => (
                  <TipItem
                    key={i}
                    text={mistake}
                    icon="close-circle-outline"
                    color="#FF4D4D"
                  />
                ))}
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  videoContainer: { width: "100%", height: VIDEO_HEIGHT, position: "relative" },
  webview: { flex: 1, backgroundColor: "#000" },
  videoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
    gap: 10,
  },
  noVideoText: { color: "#555", fontSize: 14 },
  backBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 20 },
  exHeader: { marginBottom: 16 },
  exName: { fontSize: 28, marginBottom: 8 },
  exDescription: { fontSize: 14, lineHeight: 22 },
  metaRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  metaCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  metaValue: { fontSize: 16 },
  metaUnit: { fontSize: 11 },
  musclesSection: { marginBottom: 20 },
  sectionLabel: { fontSize: 16, marginBottom: 10 },
  muscleChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13 },
  tabBar: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  tabActive: {},
  tabText: { fontSize: 12 },
  tabContent: {},
  stepsList: { gap: 12 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepNumberText: { color: "#fff", fontSize: 13 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 22, paddingTop: 3 },
  tipsList: { gap: 10 },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
  },
  tipText: { flex: 1, fontSize: 14, lineHeight: 22 },
  errorText: { fontSize: 16, marginBottom: 16 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: "#fff", fontSize: 14 },
});
