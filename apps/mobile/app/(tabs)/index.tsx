import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  useColorScheme,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Animated, {
  FadeInDown,
  FadeInRight,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";
import { PROGRAMS } from "@/data/programs";
import { EXERCISES } from "@/data/exercises";

const DAILY_QUOTES: Record<string, string[]> = {
  en: [
    "Push yourself, because no one else is going to do it for you.",
    "The only bad workout is the one that didn't happen.",
    "Your body can stand almost anything. It's your mind you have to convince.",
    "Success starts with self-discipline.",
    "Don't stop when you're tired. Stop when you're done.",
  ],
  fr: [
    "Pousse-toi, car personne d'autre ne le fera pour toi.",
    "Le seul mauvais entraînement est celui qui n'a pas eu lieu.",
    "Ton corps peut presque tout supporter. C'est ton esprit qu'il faut convaincre.",
    "Le succès commence par la discipline.",
    "N'arrête pas quand tu es fatigué. Arrête quand tu as terminé.",
  ],
  es: [
    "Empújate a ti mismo, porque nadie más lo hará.",
    "El único mal entrenamiento es el que no ocurrió.",
    "Tu cuerpo puede soportar casi todo. Es tu mente la que debes convencer.",
    "El éxito empieza con la autodisciplina.",
    "No pares cuando estés cansado. Para cuando hayas terminado.",
  ],
  de: [
    "Treibe dich selbst an, denn niemand anderes wird es tun.",
    "Das einzige schlechte Training ist das, das nicht stattfand.",
    "Dein Körper kann fast alles ertragen. Du musst deinen Geist überzeugen.",
    "Erfolg beginnt mit Selbstdisziplin.",
    "Hör nicht auf wenn du müde bist. Hör auf wenn du fertig bist.",
  ],
  ar: [
    "ادفع نفسك، لأنه لن يفعل ذلك أحد غيرك.",
    "التمرين السيئ الوحيد هو الذي لم يحدث.",
    "جسمك يتحمل تقريباً كل شيء. عقلك هو ما تحتاج إلى إقناعه.",
    "النجاح يبدأ بالانضباط الذاتي.",
    "لا تتوقف عندما تشعر بالتعب. توقف عندما تنتهي.",
  ],
};

function getGreeting(lang: string, tFn: (k: any) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return tFn("goodMorning");
  if (hour < 17) return tFn("goodAfternoon");
  return tFn("goodEvening");
}

function StatCard({ value, label, icon, color, delay }: {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  color: string;
  delay: number;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={[styles.statCard, { backgroundColor: theme.card }]}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "20" }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>{label}</Text>
    </Animated.View>
  );
}

function WeekBar({ value, label, isToday, onPress }: { value: number; label: string; isToday: boolean; onPress?: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const height = value > 0 ? Math.max(8, Math.min(value * 30, 60)) : 4;

  return (
    <Pressable onPress={onPress} style={styles.weekBarContainer}>
      <View style={[styles.weekBarBg, { backgroundColor: theme.border }]}>
        <View
          style={[
            styles.weekBarFill,
            {
              height,
              backgroundColor: isToday ? theme.accent : value > 0 ? theme.accentLight : "transparent",
            },
          ]}
        />
      </View>
      <Text style={[styles.weekBarLabel, { color: isToday ? theme.accent : theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { t, language } = useLanguage();
  const { profile, totalWorkouts, totalMinutes, totalCalories, streakDays, weeklyProgress, sessions } = useWorkout();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const [selectedDay, setSelectedDay] = useState<{ label: string; date: Date; sessions: typeof sessions } | null>(null);

  const displayName = user?.displayName || profile.name;

  const quote = useMemo(() => {
    const quotes = DAILY_QUOTES[language] ?? DAILY_QUOTES.en;
    const dayIndex = new Date().getDay();
    return quotes[dayIndex % quotes.length];
  }, [language]);

  const allDayLabels = [t("sunday"), t("monday"), t("tuesday"), t("wednesday"), t("thursday"), t("friday"), t("saturday")];
  const weekDates = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((offset) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - offset));
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, []);
  const weekLabels = weekDates.map((d) => {
    const fullLabel = allDayLabels[d.getDay()];
    return fullLabel.slice(0, 3);
  });

  const handleBarPress = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const date = weekDates[index];
    const dateStr = date.toISOString().split("T")[0];
    const daySessions = sessions.filter((s) => {
      const sd = new Date(s.date);
      sd.setHours(0, 0, 0, 0);
      return sd.toISOString().split("T")[0] === dateStr;
    });
    setSelectedDay({ label: allDayLabels[date.getDay()], date, sessions: daySessions });
  };

  const featuredProgram = PROGRAMS[0];
  const handleProgramPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: "/program/[id]", params: { id: featuredProgram.id } });
  };

  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const webBottomPadding = Platform.OS === "web" ? 34 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: Platform.OS === "web" ? webTopPadding : insets.top + 16,
        paddingBottom: Platform.OS === "web" ? webBottomPadding + 100 : 100,
      }}
    >
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
            {getGreeting(language, t)}
          </Text>
          <Text style={[styles.profileName, { color: theme.text, fontFamily: "Outfit_800ExtraBold" }]}>
            {displayName}
          </Text>
        </View>
        {streakDays > 0 && (
          <View style={[styles.streakBadge, { backgroundColor: theme.accent + "20" }]}>
            <Ionicons name="flame" size={16} color={theme.accent} />
            <Text style={[styles.streakText, { color: theme.accent, fontFamily: "Outfit_700Bold" }]}>
              {streakDays}
            </Text>
          </View>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.quoteCard}>
        <LinearGradient
          colors={["#FF6B2C", "#FF4D00"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quoteGradient}
        >
          <Ionicons name="flash" size={20} color="rgba(255,255,255,0.8)" />
          <Text style={[styles.quoteText, { fontFamily: "Outfit_600SemiBold" }]}>{quote}</Text>
        </LinearGradient>
      </Animated.View>

      <View style={styles.statsRow}>
        <StatCard
          value={totalWorkouts}
          label={t("totalWorkouts")}
          icon={<Ionicons name="barbell-outline" size={20} color={theme.accent} />}
          color={theme.accent}
          delay={120}
        />
        <StatCard
          value={totalMinutes}
          label={t("totalMinutes")}
          icon={<Ionicons name="time-outline" size={20} color="#4CAF7D" />}
          color="#4CAF7D"
          delay={150}
        />
        <StatCard
          value={totalCalories}
          label={t("caloriesBurned")}
          icon={<Ionicons name="flame-outline" size={20} color="#FFB547" />}
          color="#FFB547"
          delay={180}
        />
      </View>

      <Animated.View entering={FadeInDown.delay(220).duration(400)} style={[styles.section, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
          {t("weeklyProgress")}
        </Text>
        <View style={styles.weekRow}>
          {weeklyProgress.map((val, i) => (
            <WeekBar
              key={i}
              value={val}
              label={weekLabels[i]}
              isToday={i === 6}
              onPress={() => handleBarPress(i)}
            />
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInRight.delay(280).duration(400)}>
        <Text style={[styles.sectionHeader, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
          {t("todayWorkout")}
        </Text>
        <Pressable
          onPress={handleProgramPress}
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <LinearGradient
            colors={featuredProgram.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featuredCard}
          >
            <View style={styles.featuredContent}>
              <View>
                <Text style={[styles.featuredTag, { fontFamily: "Outfit_600SemiBold" }]}>
                  {t(featuredProgram.nameKey as any)}
                </Text>
                <Text style={[styles.featuredTitle, { fontFamily: "Outfit_800ExtraBold" }]}>
                  {t(featuredProgram.type === "home" ? "homeWorkouts" : "gymWorkouts")}
                </Text>
                <View style={styles.featuredMeta}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={[styles.featuredMetaText, { fontFamily: "Outfit_500Medium" }]}>
                    {featuredProgram.durationMin} {t("minutes")}
                  </Text>
                  <Text style={[styles.featuredMetaText, { fontFamily: "Outfit_500Medium" }]}>
                    · {featuredProgram.workouts.length} {t("exercises")}
                  </Text>
                </View>
              </View>
              <View style={styles.startBtn}>
                <Ionicons name="play" size={20} color="#FF6B2C" />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(340).duration(400)}>
        <Text style={[styles.sectionHeader, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
          {t("exercises")}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exerciseRow}>
          {EXERCISES.slice(0, 6).map((ex, i) => (
            <Pressable
              key={ex.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: "/exercise/[id]", params: { id: ex.id } });
              }}
              style={({ pressed }) => [
                styles.exerciseCard,
                { backgroundColor: theme.card, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <View style={[styles.exerciseIconWrap, { backgroundColor: ex.imageColor + "25" }]}>
                <MaterialCommunityIcons name="dumbbell" size={28} color={ex.imageColor} />
              </View>
              <Text style={[styles.exerciseName, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]} numberOfLines={2}>
                {ex.translations[language as keyof typeof ex.translations]?.name ?? ex.translations.en.name}
              </Text>
              <Text style={[styles.exerciseMeta, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                {t(ex.difficulty)} · {ex.calories} {t("kcal")}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      <Modal
        visible={selectedDay !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedDay(null)}
      >
        <Pressable style={styles.dayModalOverlay} onPress={() => setSelectedDay(null)}>
          <Pressable style={[styles.dayModalSheet, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={[styles.dayModalHandle, { backgroundColor: theme.border }]} />
            <Text style={[styles.dayModalTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
              {selectedDay?.label} — {selectedDay?.date.toLocaleDateString()}
            </Text>

            {selectedDay && selectedDay.sessions.length === 0 ? (
              <View style={styles.dayModalEmpty}>
                <Ionicons name="moon-outline" size={36} color={theme.textMuted} />
                <Text style={[styles.dayModalEmptyText, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                  {t("noHistoryYet")}
                </Text>
              </View>
            ) : (
              selectedDay?.sessions.map((s) => {
                const prog = PROGRAMS.find((p) => p.id === s.programId);
                const progName = prog ? t(prog.nameKey as Parameters<typeof t>[0]) : s.programId;
                return (
                  <View key={s.id} style={[styles.daySessionRow, { borderBottomColor: theme.border }]}>
                    <View style={[styles.daySessionIcon, { backgroundColor: theme.accent + "20" }]}>
                      <Ionicons
                        name={s.type === "cardio" ? "heart-outline" : "barbell-outline"}
                        size={18}
                        color={theme.accent}
                      />
                    </View>
                    <View style={styles.daySessionInfo}>
                      <Text style={[styles.daySessionName, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
                        {progName}
                      </Text>
                      <Text style={[styles.daySessionMeta, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                        {s.durationMin} {t("minutes")} · {s.calories} {t("kcal")}
                      </Text>
                    </View>
                    {s.completed && <Ionicons name="checkmark-circle" size={20} color={theme.success} />}
                  </View>
                );
              })
            )}

            <Pressable
              onPress={() => setSelectedDay(null)}
              style={({ pressed }) => [styles.dayModalClose, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.dayModalCloseText, { fontFamily: "Outfit_600SemiBold" }]}>{t("close")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: { fontSize: 14, marginBottom: 2 },
  profileName: { fontSize: 26 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: { fontSize: 16 },
  quoteCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, overflow: "hidden" },
  quoteGradient: { padding: 16, gap: 8, flexDirection: "row", alignItems: "flex-start" },
  quoteText: { color: "#fff", fontSize: 13, flex: 1, lineHeight: 20 },
  statsRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  statIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 20, lineHeight: 24 },
  statLabel: { fontSize: 10, textAlign: "center" },
  section: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 16, marginBottom: 12 },
  weekRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  weekBarContainer: { alignItems: "center", gap: 6 },
  weekBarBg: {
    width: 28,
    height: 60,
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  weekBarFill: { width: "100%", borderRadius: 8 },
  weekBarLabel: { fontSize: 10 },
  sectionHeader: { fontSize: 18, paddingHorizontal: 20, marginBottom: 14 },
  featuredCard: { marginHorizontal: 20, borderRadius: 20, padding: 20, marginBottom: 20 },
  featuredContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  featuredTag: { color: "rgba(255,255,255,0.7)", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  featuredTitle: { color: "#fff", fontSize: 22, marginBottom: 8 },
  featuredMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  featuredMetaText: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  startBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseRow: { paddingLeft: 20 },
  exerciseCard: {
    width: 130,
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    gap: 8,
    marginBottom: 4,
  },
  exerciseIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  exerciseName: { fontSize: 14, lineHeight: 18 },
  exerciseMeta: { fontSize: 11 },
  dayModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  dayModalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  dayModalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  dayModalTitle: { fontSize: 20, marginBottom: 16 },
  dayModalEmpty: { alignItems: "center", paddingVertical: 30, gap: 10 },
  dayModalEmptyText: { fontSize: 14 },
  daySessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  daySessionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  daySessionInfo: { flex: 1 },
  daySessionName: { fontSize: 15, marginBottom: 2 },
  daySessionMeta: { fontSize: 12 },
  dayModalClose: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 16 },
  dayModalCloseText: { color: "#fff", fontSize: 15 },
});
