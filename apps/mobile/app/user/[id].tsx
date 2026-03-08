import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";

function StatCard({ icon, value, label, color, theme }: any) {
  return (
    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.statValue, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>{label}</Text>
    </View>
  );
}

function PrivateSection({ label, theme }: { label: string; theme: any }) {
  return (
    <View style={[styles.privateSection, { backgroundColor: theme.card }]}>
      <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} />
      <Text style={[styles.privateSectionText, { color: theme.textMuted, fontFamily: "Outfit_500Medium" }]}>
        {label}
      </Text>
    </View>
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const webTop = Platform.OS === "web" ? 67 : 0;

  const { data, isLoading } = useQuery<{ profile: any }>({
    queryKey: ["/api/users", id, "profile"],
  });

  const profile = data?.profile;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, alignItems: "center", justifyContent: "center" }]}>
        <Ionicons name="person-outline" size={48} color={theme.textMuted} />
        <Text style={[styles.notFoundText, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
          {t("programNotFound" as any)}
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.accent, fontFamily: "Outfit_600SemiBold" }}>{t("back")}</Text>
        </Pressable>
      </View>
    );
  }

  const initials = (profile.displayName || "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isOwn = currentUser?.id === profile.id;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#FF6B2C", "#FF8C5A"]}
        style={[styles.hero, { paddingTop: insets.top + webTop + 16 }]}
      >
        <View style={styles.heroTopRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Text style={[styles.heroTitle, { fontFamily: "Outfit_600SemiBold" }]}>
            {t("publicProfile")}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.avatarLarge}>
          <Text style={[styles.avatarLargeText, { fontFamily: "Outfit_800ExtraBold" }]}>{initials}</Text>
        </View>
        <Text style={[styles.heroName, { fontFamily: "Outfit_800ExtraBold" }]}>
          {profile.displayName}
        </Text>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="shield-outline" size={12} color="rgba(255,255,255,0.9)" />
            <Text style={[styles.heroBadgeText, { fontFamily: "Outfit_500Medium" }]}>
              {profile.level ? t(profile.level) : ""}
            </Text>
          </View>
          {profile.objective && (
            <View style={styles.heroBadge}>
              <Ionicons name="flag-outline" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={[styles.heroBadgeText, { fontFamily: "Outfit_500Medium" }]}>
                {t(profile.objective as any)}
              </Text>
            </View>
          )}
        </View>
        {!!profile.bio && (
          <Text style={[styles.heroBio, { fontFamily: "Outfit_400Regular" }]}>
            {profile.bio}
          </Text>
        )}
      </LinearGradient>

      {profile.isPrivate ? (
        <PrivateSection label={t("privateSection")} theme={theme} />
      ) : (
        <View style={styles.sections}>
          {profile.stats ? (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
                {t("statistics")}
              </Text>
              <View style={styles.statsRow}>
                <StatCard icon="barbell-outline" value={profile.stats.totalSessions} label={t("totalSessions")} color="#FF6B2C" theme={theme} />
                <StatCard icon="time-outline" value={profile.stats.totalMinutes} label={t("minutes")} color="#4CAF50" theme={theme} />
                <StatCard icon="flame-outline" value={profile.stats.totalCalories} label={t("kcal")} color="#FFD700" theme={theme} />
              </View>
            </Animated.View>
          ) : (
            !isOwn && <PrivateSection label={t("privateSection")} theme={theme} />
          )}

          {profile.goals ? (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
                {t("goals")}
              </Text>
              {profile.goals.length > 0 ? (
                profile.goals.map((goal: any) => {
                  const pct = goal.target > 0 ? Math.min(1, (goal.current || 0) / goal.target) : 0;
                  return (
                    <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.card }]}>
                      <Text style={[styles.goalTitle, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
                        {goal.title}
                      </Text>
                      <View style={[styles.goalProgress, { backgroundColor: theme.border }]}>
                        <View style={[styles.goalProgressFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: "#FF6B2C" }]} />
                      </View>
                      <Text style={[styles.goalStats, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
                        {goal.current || 0}/{goal.target} {goal.unit}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Outfit_400Regular" }]}>
                  {t("noGoals")}
                </Text>
              )}
            </Animated.View>
          ) : null}

          {profile.posts ? (
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <Text style={[styles.sectionTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
                {t("publications")}
              </Text>
              {profile.posts.length > 0 ? (
                profile.posts.slice(0, 10).map((post: any) => (
                  <View key={post.id} style={[styles.postPreview, { backgroundColor: theme.card }]}>
                    <Text style={[styles.postPreviewContent, { color: theme.text, fontFamily: "Outfit_400Regular" }]} numberOfLines={3}>
                      {post.content}
                    </Text>
                    <View style={styles.postPreviewMeta}>
                      <Ionicons name="heart" size={12} color="#FF4444" />
                      <Text style={[styles.postPreviewMetaText, { color: theme.textMuted, fontFamily: "Outfit_400Regular" }]}>
                        {post.likeCount || 0}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "Outfit_400Regular" }]}>
                  {t("noPostsYet")}
                </Text>
              )}
            </Animated.View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 28, alignItems: "center" },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "rgba(255,255,255,0.9)", fontSize: 16 },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarLargeText: { color: "#fff", fontSize: 28 },
  heroName: { color: "#fff", fontSize: 26, marginBottom: 8 },
  heroBadgeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16,
  },
  heroBadgeText: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
  heroBio: { color: "rgba(255,255,255,0.8)", fontSize: 14, textAlign: "center", lineHeight: 20 },
  sections: { paddingHorizontal: 20, gap: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 18, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", gap: 4 },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 11 },
  goalCard: { borderRadius: 14, padding: 14, gap: 8, marginBottom: 8 },
  goalTitle: { fontSize: 14 },
  goalProgress: { height: 6, borderRadius: 3, overflow: "hidden" },
  goalProgressFill: { height: "100%", borderRadius: 3 },
  goalStats: { fontSize: 12 },
  postPreview: { borderRadius: 14, padding: 14, gap: 8, marginBottom: 8 },
  postPreviewContent: { fontSize: 13, lineHeight: 18 },
  postPreviewMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  postPreviewMetaText: { fontSize: 12 },
  privateSection: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, margin: 20, padding: 30, borderRadius: 16,
  },
  privateSectionText: { fontSize: 15 },
  emptyText: { fontSize: 14, textAlign: "center", paddingVertical: 16 },
  notFoundText: { fontSize: 18, marginTop: 12 },
});
