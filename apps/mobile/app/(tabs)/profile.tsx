import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  useColorScheme,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkout, UserProfile } from "@/contexts/WorkoutContext";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const OBJECTIVES = ["massMuscle", "weightLoss", "endurance", "recomposition"] as const;

function InfoRow({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { t } = useLanguage();
  const { profile, updateProfile, totalWorkouts, totalMinutes, totalCalories, sessions } = useWorkout();
  const { user, isGuest, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState<UserProfile>({ ...profile });

  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  if (isGuest) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={{ paddingTop: Platform.OS === "web" ? webTopPadding + 16 : insets.top + 16, paddingHorizontal: 20, paddingBottom: 12 }}>
          <Text style={[styles.profileName, { color: theme.text, fontFamily: "Outfit_800ExtraBold", fontSize: 32 }]}>
            {t("profile")}
          </Text>
        </View>
        <View style={styles.guestPromptWrap}>
          <Ionicons name="lock-closed-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.guestPromptTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
            {t("loginToAccess")}
          </Text>
          <Text style={[styles.guestPromptText, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
            {t("guestModePrompt")}
          </Text>
          <Pressable
            onPress={() => logout()}
            style={({ pressed }) => [styles.guestLoginBtn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" />
            <Text style={[styles.guestLoginBtnText, { fontFamily: "Outfit_700Bold" }]}>{t("login")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const handleSave = () => {
    updateProfile(form);
    setShowEdit(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const displayName = user?.displayName || profile.name;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: Platform.OS === "web" ? webTopPadding : insets.top,
          paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
        }}
      >
        <LinearGradient
          colors={["#FF6B2C", "#CC5520"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <Pressable
            onPress={() => router.push("/(tabs)/settings")}
            style={({ pressed }) => [styles.gearBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>
          <View style={styles.avatarCircle}>
            <Text style={[styles.avatarText, { fontFamily: "Outfit_800ExtraBold" }]}>{initials}</Text>
          </View>
          <Text style={[styles.profileName, { fontFamily: "Outfit_800ExtraBold" }]}>{displayName}</Text>
          {user?.email ? (
            <Text style={[styles.profileLevel, { fontFamily: "Outfit_400Regular" }]}>{user.email}</Text>
          ) : null}
          <Text style={[styles.profileLevel, { fontFamily: "Outfit_500Medium" }]}>{t(profile.level)}</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setForm({ ...profile });
              setShowEdit(true);
            }}
            style={({ pressed }) => [styles.editBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="pencil" size={14} color="#FF6B2C" />
            <Text style={[styles.editBtnText, { fontFamily: "Outfit_600SemiBold" }]}>{t("editProfile")}</Text>
          </Pressable>
        </LinearGradient>

        <View style={styles.statsRow}>
          {[
            { value: totalWorkouts, label: t("totalSessions"), icon: "barbell-outline", color: "#FF6B2C" },
            { value: totalMinutes, label: t("totalMinutes"), icon: "time-outline", color: "#4CAF7D" },
            { value: totalCalories, label: t("caloriesBurned"), icon: "flame-outline", color: "#FFB547" },
          ].map((stat, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(i * 60).duration(400)} style={[styles.statCard, { backgroundColor: theme.card }]}>
              <Ionicons name={stat.icon as any} size={20} color={stat.color} />
              <Text style={[styles.statValue, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>{stat.label}</Text>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={[styles.infoCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{t("myProfile")}</Text>
          <InfoRow icon="person-outline" label={t("name")} value={profile.name} color="#FF6B2C" />
          <InfoRow icon="calendar-outline" label={t("age")} value={`${profile.age} ${t("years")}`} color="#4CAF7D" />
          <InfoRow icon="scale-outline" label={t("weight")} value={`${profile.weight} ${t("kg")}`} color="#FFB547" />
          <InfoRow icon="resize-outline" label={t("height")} value={`${profile.height} ${t("cm")}`} color="#6C63FF" />
          <InfoRow icon="trophy-outline" label={t("objective")} value={t(profile.objective)} color="#E91E8C" />
        </Animated.View>

        {sessions.length > 0 && (
          <Animated.View entering={FadeInDown.delay(240).duration(400)} style={[styles.historyCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.cardTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{t("workoutHistory")}</Text>
            {sessions.slice(0, 5).map((session) => {
              const date = new Date(session.date);
              const today = new Date();
              const isToday = date.toDateString() === today.toDateString();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              const isYesterday = date.toDateString() === yesterday.toDateString();
              const label = isToday ? t("today") : isYesterday ? t("yesterday") : date.toLocaleDateString();

              return (
                <View key={session.id} style={[styles.historyRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.historyIcon, { backgroundColor: theme.accent + "20" }]}>
                    <Ionicons name="barbell-outline" size={16} color={theme.accent} />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyDate, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>{label}</Text>
                    <Text style={[styles.historyMeta, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                      {session.durationMin} {t("minutes")} · {session.calories} {t("kcal")}
                    </Text>
                  </View>
                  {session.completed && <Ionicons name="checkmark-circle" size={20} color={theme.success} />}
                </View>
              );
            })}
          </Animated.View>
        )}

        {sessions.length === 0 && (
          <Animated.View entering={FadeInDown.delay(240).duration(400)} style={styles.emptyHistory}>
            <Ionicons name="barbell-outline" size={44} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>{t("noHistoryYet")}</Text>
            <Text style={[styles.emptySubText, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>{t("startYourJourney")}</Text>
          </Animated.View>
        )}
      </ScrollView>

      <Modal visible={showEdit} animationType="slide" transparent onRequestClose={() => setShowEdit(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowEdit(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: theme.card }]} onPress={() => {}}>
            <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{t("editProfile")}</Text>

              {([
                { key: "name", label: t("name"), keyboardType: "default" },
                { key: "age", label: t("age"), keyboardType: "numeric" },
                { key: "weight", label: `${t("weight")} (kg)`, keyboardType: "numeric" },
                { key: "height", label: `${t("height")} (cm)`, keyboardType: "numeric" },
              ] as const).map((field) => (
                <View key={field.key}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>{field.label}</Text>
                  <TextInput
                    value={String(form[field.key])}
                    onChangeText={(v) => setForm((prev) => ({ ...prev, [field.key]: field.keyboardType === "numeric" ? parseFloat(v) || 0 : v }))}
                    keyboardType={field.keyboardType as any}
                    style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border, fontFamily: "Outfit_400Regular" }]}
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              ))}

              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>{t("level")}</Text>
              <View style={styles.chipRow}>
                {LEVELS.map((lv) => (
                  <Pressable
                    key={lv}
                    onPress={() => setForm((p) => ({ ...p, level: lv }))}
                    style={[styles.chip, { backgroundColor: form.level === lv ? theme.accent : theme.background, borderColor: form.level === lv ? theme.accent : theme.border }]}
                  >
                    <Text style={[styles.chipText, { color: form.level === lv ? "#fff" : theme.textSecondary, fontFamily: "Outfit_600SemiBold" }]}>{t(lv)}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.textSecondary, fontFamily: "Outfit_500Medium" }]}>{t("objective")}</Text>
              <View style={styles.chipRow}>
                {OBJECTIVES.map((obj) => (
                  <Pressable
                    key={obj}
                    onPress={() => setForm((p) => ({ ...p, objective: obj }))}
                    style={[styles.chip, { backgroundColor: form.objective === obj ? theme.accent : theme.background, borderColor: form.objective === obj ? theme.accent : theme.border }]}
                  >
                    <Text style={[styles.chipText, { color: form.objective === obj ? "#fff" : theme.textSecondary, fontFamily: "Outfit_600SemiBold" }]}>{t(obj)}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [styles.saveBtn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.saveBtnText, { fontFamily: "Outfit_700Bold" }]}>{t("saveChanges")}</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroSection: { padding: 30, alignItems: "center", paddingBottom: 28, position: "relative" as const },
  gearBtn: { position: "absolute" as const, top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center" },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 28 },
  profileName: { color: "#fff", fontSize: 24, marginBottom: 4 },
  profileLevel: { color: "rgba(255,255,255,0.8)", fontSize: 14, marginBottom: 16 },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  editBtnText: { color: "#FF6B2C", fontSize: 14 },
  statsRow: { flexDirection: "row", padding: 20, gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18 },
  statLabel: { fontSize: 10, textAlign: "center" },
  infoCard: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 17, marginBottom: 12 },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, marginBottom: 1 },
  infoValue: { fontSize: 14 },
  historyCard: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 14 },
  historyRow: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: 14 },
  historyMeta: { fontSize: 12 },
  emptyHistory: { margin: 20, alignItems: "center", gap: 10, padding: 30 },
  emptyText: { fontSize: 16 },
  emptySubText: { fontSize: 13, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: "90%" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 22, marginBottom: 16 },
  fieldLabel: { fontSize: 13, marginBottom: 8, marginTop: 12 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 16, marginBottom: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13 },
  saveBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 24, marginBottom: 8 },
  saveBtnText: { color: "#fff", fontSize: 16 },
  guestPromptWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 },
  guestPromptTitle: { fontSize: 20, textAlign: "center" as const },
  guestPromptText: { fontSize: 14, textAlign: "center" as const, lineHeight: 20 },
  guestLoginBtn: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  guestLoginBtnText: { color: "#fff", fontSize: 16 },
});
