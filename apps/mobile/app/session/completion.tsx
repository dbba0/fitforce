import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Badge, GhostButton, PrimaryButton } from "@/components/ui";
import { Typography } from "@/constants/typography";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppTheme } from "@/hooks";

function numberParam(value: string | string[] | undefined, fallback = 0): number {
  const normalized = Array.isArray(value) ? value[0] : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringParam(value: string | string[] | undefined, fallback = ""): string {
  const normalized = Array.isArray(value) ? value[0] : value;
  return typeof normalized === "string" && normalized.trim().length > 0 ? normalized.trim() : fallback;
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const restSeconds = safeSeconds % 60;
  if (minutes <= 0) return `0:${String(restSeconds).padStart(2, "0")}`;
  return `${minutes}:${String(restSeconds).padStart(2, "0")}`;
}

export default function SessionCompletionScreen() {
  const { t } = useLanguage();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    duration?: string | string[];
    exercisesCompleted?: string | string[];
    totalSeries?: string | string[];
    programName?: string | string[];
    prCount?: string | string[];
  }>();

  const durationSeconds = numberParam(params.duration, 0);
  const exercisesCompleted = numberParam(params.exercisesCompleted, 0);
  const totalSeries = numberParam(params.totalSeries, 0);
  const prCount = numberParam(params.prCount, 0);
  const programName = stringParam(params.programName, t("workout"));

  const stats = useMemo(
    () => [
      {
        key: "duration",
        value: formatDuration(durationSeconds),
        label: t("sessionDurationLabel"),
      },
      {
        key: "exercises",
        value: String(Math.max(0, exercisesCompleted)),
        label: t("exercises"),
      },
      {
        key: "series",
        value: String(Math.max(0, totalSeries)),
        label: t("sets"),
      },
    ],
    [durationSeconds, exercisesCompleted, totalSeries, t]
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: "#000000",
          paddingTop: insets.top + 18,
          paddingBottom: Math.max(insets.bottom, 16) + 18,
        },
      ]}
    >
      <View style={styles.heroBlock}>
        <View style={[styles.checkWrap, { borderColor: `${colors.accent}88`, backgroundColor: `${colors.accent}1E` }]}>
          <Ionicons name="checkmark" size={70} color={colors.accent} />
        </View>

        <Text style={[styles.title, { color: "#FFFFFF", fontFamily: Typography.titleStrong }]}>
          {t("sessionDoneTitle")}
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: Typography.body }]} numberOfLines={2}>
          {programName}
        </Text>

        {prCount > 0 ? (
          <Badge
            label={`${t("sessionNewPrBadge")} ×${prCount}`}
            variant="mint"
            style={styles.prBadge}
          />
        ) : null}
      </View>

      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View
            key={stat.key}
            style={[
              styles.statCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.statValue, { color: stat.key === "duration" ? colors.accent : "#FFFFFF", fontFamily: Typography.titleStrong }]}>
              {stat.value}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: Typography.labelTech }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label={t("sessionBackHome")}
          onPress={() => router.replace("/(tabs)")}
          style={styles.primaryCta}
          textStyle={styles.primaryCtaText}
        />

        <GhostButton
          label={t("sessionCompletionViewProgress")}
          onPress={() => router.push("/progress" as never)}
          style={[styles.secondaryCta, { borderColor: colors.border, backgroundColor: "transparent" }]}
          textStyle={[styles.secondaryCtaText, { color: colors.textSecondary }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
    gap: 20,
  },
  heroBlock: {
    alignItems: "center",
    gap: 12,
    paddingTop: 12,
  },
  checkWrap: {
    width: 126,
    height: 126,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    textAlign: "center",
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  prBadge: {
    marginTop: 4,
    minHeight: 26,
    paddingHorizontal: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    minHeight: 104,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 6,
  },
  statValue: {
    fontSize: 28,
    lineHeight: 30,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
  },
  actions: {
    gap: 10,
  },
  primaryCta: {
    width: "100%",
    minHeight: 52,
  },
  primaryCtaText: {
    fontFamily: Typography.titleStrong,
  },
  secondaryCta: {
    width: "100%",
    minHeight: 46,
  },
  secondaryCtaText: {
    fontFamily: Typography.bodySemiBold,
  },
});
