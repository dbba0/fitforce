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
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/colors";
import { Avatar, Badge, Card, GoalCard, SectionLabel, StatBlock } from "@/components/ui";

function StatCard({ icon, value, label, color }: any) {
  return (
    <StatBlock
      iconName={icon}
      value={value}
      label={label}
      color={color}
      compact
      style={styles.statCard}
    />
  );
}

function PrivateSection({ label, theme }: { label: string; theme: any }) {
  return (
    <Card style={styles.privateSection}>
      <Ionicons name="lock-closed-outline" size={20} color={theme.textMuted} />
      <Text style={[styles.privateSectionText, { color: theme.textMuted, fontFamily: "DMSans_500Medium" }]}>
        {label}
      </Text>
    </Card>
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
        <Text style={[styles.notFoundText, { color: theme.text, fontFamily: "DMSans_600SemiBold" }]}>
          {t("programNotFound" as any)}
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.accent, fontFamily: "DMSans_600SemiBold" }}>{t("back")}</Text>
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
      <View
        style={[
          styles.hero,
          {
            paddingTop: insets.top + webTop + 16,
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.heroTitle, { color: theme.textSecondary, fontFamily: "DMSans_600SemiBold" }]}>
            {t("publicProfile")}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <Avatar name={profile.displayName} initials={initials} size={80} color={theme.accent} mode="tint" style={styles.avatarLarge} />
        <Text style={[styles.heroName, { color: theme.text, fontFamily: "Syne_800ExtraBold" }]}>
          {profile.displayName}
        </Text>
        <View style={styles.heroBadgeRow}>
          <Badge label={profile.level ? t(profile.level) : ""} variant="ember" style={styles.heroBadge} />
          {profile.objective && (
            <Badge label={t(profile.objective as any)} variant="mint" style={styles.heroBadge} />
          )}
        </View>
        {!!profile.bio && (
          <Text style={[styles.heroBio, { color: theme.textSecondary, fontFamily: "DMSans_400Regular" }]}>
            {profile.bio}
          </Text>
        )}
      </View>

      {profile.isPrivate ? (
        <PrivateSection label={t("privateSection")} theme={theme} />
      ) : (
        <View style={styles.sections}>
          {profile.stats ? (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <SectionLabel textStyle={[styles.sectionTitle, { color: theme.text }]}>{t("statistics")}</SectionLabel>
              <View style={styles.statsRow}>
                <StatCard icon="barbell-outline" value={profile.stats.totalSessions} label={t("totalSessions")} color="#FF6B2C" />
                <StatCard icon="time-outline" value={profile.stats.totalMinutes} label={t("minutes")} color="#4CAF50" />
                <StatCard icon="flame-outline" value={profile.stats.totalCalories} label={t("kcal")} color="#FFD700" />
              </View>
            </Animated.View>
          ) : (
            !isOwn && <PrivateSection label={t("privateSection")} theme={theme} />
          )}

          {profile.goals ? (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <SectionLabel textStyle={[styles.sectionTitle, { color: theme.text }]}>{t("goals")}</SectionLabel>
              {profile.goals.length > 0 ? (
                profile.goals.map((goal: any) => {
                  const pct = goal.target > 0 ? Math.min(1, (goal.current || 0) / goal.target) : 0;
                  return (
                    <GoalCard
                      key={goal.id}
                      goal={{
                        title: goal.title,
                        current: goal.current || 0,
                        target: goal.target || 0,
                        unit: goal.unit,
                        progress: pct,
                        statusLabel: `${goal.current || 0}/${goal.target} ${goal.unit ?? ""}`,
                      }}
                      color={theme.accent}
                      style={styles.goalCard}
                    />
                  );
                })
              ) : (
                <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "DMSans_400Regular" }]}>
                  {t("noGoals")}
                </Text>
              )}
            </Animated.View>
          ) : null}

          {profile.posts ? (
            <Animated.View entering={FadeInDown.delay(300).duration(400)}>
              <SectionLabel textStyle={[styles.sectionTitle, { color: theme.text }]}>{t("publications")}</SectionLabel>
              {profile.posts.length > 0 ? (
                profile.posts.slice(0, 10).map((post: any) => (
                  <Card key={post.id} style={styles.postPreview}>
                    <Text style={[styles.postPreviewContent, { color: theme.text, fontFamily: "DMSans_400Regular" }]} numberOfLines={3}>
                      {post.content}
                    </Text>
                    <View style={styles.postPreviewMeta}>
                      <Ionicons name="heart" size={12} color="#FF4444" />
                      <Text style={[styles.postPreviewMetaText, { color: theme.textMuted, fontFamily: "DMSans_400Regular" }]}>
                        {post.likeCount || 0}
                      </Text>
                    </View>
                  </Card>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: theme.textMuted, fontFamily: "DMSans_400Regular" }]}>
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
  hero: { paddingHorizontal: 20, paddingBottom: 28, alignItems: "center", borderBottomWidth: 1 },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 16 },
  avatarLarge: { borderWidth: 1, marginBottom: 12 },
  heroName: { fontSize: 26, marginBottom: 8 },
  heroBadgeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  heroBadge: {
    minHeight: 24,
    paddingHorizontal: 12,
  },
  heroBio: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  sections: { paddingHorizontal: 20, gap: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 10, marginBottom: 12, letterSpacing: 1.2 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1 },
  goalCard: { marginBottom: 8 },
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
