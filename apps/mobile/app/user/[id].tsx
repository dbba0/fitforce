import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, Badge, Card, SectionLabel, StatBlock } from "@/components/ui";
import { apiRequest } from "@/lib/query-client";
import { useAppTheme } from "@/hooks";

const ACCENT = "#FF5500";
const BG = "#111111";

function StatCard({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <StatBlock
      iconName={icon as any}
      value={String(value)}
      label={label}
      color={color}
      compact
      style={styles.statCard}
    />
  );
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const userId = Array.isArray(id) ? id[0] : id;
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useAppTheme();
  const qc = useQueryClient();

  const isOwn = !!currentUser?.id && currentUser.id === userId;

  const { data, isLoading, isError } = useQuery<{ profile: any }>({
    queryKey: ["/api/users", userId, "profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${userId}/profile`);
      return res.json();
    },
    enabled: !!userId,
  });

  const profile = data?.profile;

  // Optimistic follow state
  const [followState, setFollowState] = useState<{ following: boolean; count: number } | null>(null);
  const followersCount = followState?.count ?? profile?.followersCount ?? 0;
  const isFollowing = followState?.following ?? false;

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/users/${userId}/follow`);
      return res.json();
    },
    onMutate: () => {
      const prev = followState?.following ?? false;
      setFollowState({ following: !prev, count: followersCount + (prev ? -1 : 1) });
    },
    onSuccess: (data) => {
      setFollowState({ following: data.following, count: data.followersCount });
      qc.invalidateQueries({ queryKey: ["/api/users", userId, "profile"] });
    },
    onError: () => setFollowState(null),
  });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  // ── Error / Not found ─────────────────────────────────────────────────────
  if (isError || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 12 }]}>
        <Ionicons name="person-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.notFoundText, { color: colors.text, fontFamily: typography.family.title }]}>
          {"Profil introuvable"}
        </Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: ACCENT, fontFamily: typography.family.bodySemiBold }}>{t("back")}</Text>
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

  const webTop = Platform.OS === "web" ? 67 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <View
        style={[
          styles.hero,
          {
            paddingTop: insets.top + webTop + 16,
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.heroTopRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.heroTitle, { color: colors.textSecondary, fontFamily: typography.family.bodySemiBold }]}>
            {t("publicProfile")}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <Avatar
          name={profile.displayName}
          initials={initials}
          size={80}
          color={ACCENT}
          mode="tint"
          style={styles.avatarLarge}
        />

        <Text style={[styles.heroName, { color: colors.text, fontFamily: typography.family.titleStrong }]}>
          {profile.displayName}
        </Text>

        <View style={styles.heroBadgeRow}>
          {!!profile.level && <Badge label={t(profile.level as any)} variant="ember" style={styles.heroBadge} />}
          {!!profile.objective && <Badge label={t(profile.objective as any)} variant="mint" style={styles.heroBadge} />}
        </View>

        {!!profile.bio && (
          <Text style={[styles.heroBio, { color: colors.textSecondary, fontFamily: typography.family.bodyRegular }]}>
            {profile.bio}
          </Text>
        )}

        {/* Social counts */}
        <View style={styles.socialRow}>
          <View style={styles.socialItem}>
            <Text style={[styles.socialCount, { color: colors.text, fontFamily: typography.family.titleStrong }]}>
              {followersCount}
            </Text>
            <Text style={[styles.socialLabel, { color: colors.textMuted, fontFamily: typography.family.bodyRegular }]}>
              followers
            </Text>
          </View>
          <View style={[styles.socialDivider, { backgroundColor: colors.border }]} />
          <View style={styles.socialItem}>
            <Text style={[styles.socialCount, { color: colors.text, fontFamily: typography.family.titleStrong }]}>
              {profile.followingCount ?? 0}
            </Text>
            <Text style={[styles.socialLabel, { color: colors.textMuted, fontFamily: typography.family.bodyRegular }]}>
              following
            </Text>
          </View>
        </View>

        {/* Follow CTA */}
        {isOwn ? (
          <View style={[styles.itsYouBadge, { backgroundColor: colors.cardElevated }]}>
            <Text style={[styles.itsYouText, { color: colors.textMuted, fontFamily: typography.family.bodySemiBold }]}>
              C'est vous
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => followMutation.mutate()}
            disabled={followMutation.isPending}
            style={({ pressed }) => [
              styles.followBtn,
              isFollowing
                ? { backgroundColor: "transparent", borderWidth: 1, borderColor: ACCENT }
                : { backgroundColor: ACCENT },
              { opacity: pressed || followMutation.isPending ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.followBtnText, { color: isFollowing ? ACCENT : "#FFF", fontFamily: typography.family.bodySemiBold }]}>
              {isFollowing ? "Ne plus suivre" : "Suivre"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* ── Stats + content ── */}
      {profile.isPrivate ? (
        <Card style={[styles.privateSection, { backgroundColor: colors.card }]}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
          <Text style={[styles.privateSectionText, { color: colors.textMuted, fontFamily: typography.family.bodyMedium }]}>
            {t("privateSection")}
          </Text>
        </Card>
      ) : (
        <View style={styles.sections}>
          {profile.stats && (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <SectionLabel textStyle={[styles.sectionTitle, { color: colors.text }]}>
                {t("statistics")}
              </SectionLabel>
              <View style={styles.statsRow}>
                <StatCard
                  icon="barbell-outline"
                  value={profile.stats.totalSessions ?? 0}
                  label={t("totalSessions")}
                  color={ACCENT}
                />
                <StatCard
                  icon="map-outline"
                  value={`${profile.stats.kmTotal ?? 0} km`}
                  label="Distance"
                  color="#4CAF50"
                />
                <StatCard
                  icon="time-outline"
                  value={`${Math.round((profile.stats.totalTimeSeconds ?? (profile.stats.totalMinutes ?? 0) * 60) / 3600)}h`}
                  label={t("totalMinutes")}
                  color="#FFD700"
                />
              </View>
            </Animated.View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: "center",
    borderBottomWidth: 1,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 16 },
  avatarLarge: { borderWidth: 1, marginBottom: 12 },
  heroName: { fontSize: 26, marginBottom: 8 },
  heroBadgeRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  heroBadge: { minHeight: 24, paddingHorizontal: 12 },
  heroBio: { fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 8 },
  socialRow: { flexDirection: "row", alignItems: "center", gap: 24, marginTop: 12, marginBottom: 16 },
  socialItem: { alignItems: "center", gap: 2 },
  socialCount: { fontSize: 20, lineHeight: 24 },
  socialLabel: { fontSize: 12 },
  socialDivider: { width: 1, height: 32 },
  followBtn: { borderRadius: 30, paddingHorizontal: 36, paddingVertical: 11 },
  followBtnText: { fontSize: 15 },
  itsYouBadge: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  itsYouText: { fontSize: 14 },
  sections: { paddingHorizontal: 20, gap: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 10, marginBottom: 12, letterSpacing: 1.2 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { flex: 1 },
  privateSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    margin: 20,
    padding: 30,
    borderRadius: 16,
  },
  privateSectionText: { fontSize: 15 },
  notFoundText: { fontSize: 18, marginTop: 12 },
});
