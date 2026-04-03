import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path } from "react-native-svg";
import type { MuscleGroup } from "@/data/exercises";
import { Chip } from "@/components/ui";
import { Typography } from "@/constants/typography";
import { useLanguage } from "@/contexts/LanguageContext";
import { TranslationKey } from "@/lib/i18n";

export type ExerciseCoachTheme = {
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  accent: string;
};

type Props = {
  muscles: MuscleGroup[];
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  title: string;
  subtitle: string;
  theme: ExerciseCoachTheme;
  highlightColor: string;
  size?: number;
  animated?: boolean;
};

type MotionType = "upper" | "lower" | "core";

const MUSCLE_TRANSLATION_KEY: Record<MuscleGroup, TranslationKey> = {
  chest: "chest",
  back: "backMuscle",
  shoulders: "shoulders",
  arms: "arms",
  core: "core",
  legs: "legs",
};

function partColor(active: boolean, theme: ExerciseCoachTheme, highlightColor: string) {
  return active ? highlightColor : theme.textSecondary;
}

export default function ExerciseCoachFigure({
  muscles,
  primaryMuscles,
  secondaryMuscles,
  title,
  subtitle,
  theme,
  highlightColor,
  size = 165,
  animated = true,
}: Props) {
  const { t } = useLanguage();
  const active = useMemo(() => new Set(muscles), [muscles]);
  const chestColor = partColor(active.has("chest"), theme, highlightColor);
  const backColor = partColor(active.has("back"), theme, highlightColor);
  const shoulderColor = partColor(active.has("shoulders"), theme, highlightColor);
  const armColor = partColor(active.has("arms"), theme, highlightColor);
  const coreColor = partColor(active.has("core"), theme, highlightColor);
  const legColor = partColor(active.has("legs"), theme, highlightColor);

  const primary = useMemo(() => {
    if (primaryMuscles?.length) return primaryMuscles;
    return muscles.length > 0 ? [muscles[0]] : [];
  }, [muscles, primaryMuscles]);

  const secondary = useMemo(() => {
    if (secondaryMuscles?.length) return secondaryMuscles;
    const primarySet = new Set(primary);
    return muscles.filter((muscle) => !primarySet.has(muscle));
  }, [muscles, primary, secondaryMuscles]);

  const motionType: MotionType = useMemo(() => {
    if (active.has("legs")) return "lower";
    if (active.has("core") && !active.has("arms") && !active.has("chest") && !active.has("back")) return "core";
    return "upper";
  }, [active]);

  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!animated) {
      setFrame(0);
      return;
    }
    const id = setInterval(() => setFrame((f) => (f + 1) % 3), 500);
    return () => clearInterval(id);
  }, [animated]);

  const pulse = frame === 1 ? 1 : 0;
  const bodyY = motionType === "lower" ? (frame === 1 ? 4 : 0) : 0;
  const armDelta = motionType === "upper" ? (frame === 1 ? -10 : frame === 2 ? 6 : 0) : 0;
  const legDelta = motionType === "lower" ? (frame === 1 ? 10 : frame === 2 ? -4 : 0) : 0;
  const corePulse = motionType === "core" ? (frame === 1 ? 1 : 0.4) : 0.4;
  const figureHeight = Math.max(154, Math.round(size * 1.08));

  return (
    <View style={[styles.wrapper, { borderColor: `${highlightColor}55`, backgroundColor: theme.card }]}>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: theme.text, fontFamily: Typography.title }]}>{title}</Text>
        <Text numberOfLines={3} style={[styles.subtitle, { color: theme.textSecondary, fontFamily: Typography.bodyRegular }]}>
          {subtitle}
        </Text>

        <View style={styles.chipsGroup}>
          <Text style={[styles.chipsLabel, { color: theme.textSecondary, fontFamily: Typography.labelTech }]}>
            {t("exerciseMediaPrimaryMuscles")}
          </Text>
          <View style={styles.chipsRow}>
            {primary.map((muscle) => (
              <Chip
                key={`primary-${muscle}`}
                label={t(MUSCLE_TRANSLATION_KEY[muscle])}
                selected
                selectedColor={highlightColor}
                style={styles.chipPrimary}
                textStyle={styles.chipText}
              />
            ))}
          </View>
        </View>

        {secondary.length > 0 ? (
          <View style={styles.chipsGroup}>
            <Text style={[styles.chipsLabel, { color: theme.textSecondary, fontFamily: Typography.labelTech }]}>
              {t("exerciseMediaSecondaryMuscles")}
            </Text>
            <View style={styles.chipsRow}>
              {secondary.map((muscle) => (
                <Chip
                  key={`secondary-${muscle}`}
                  label={t(MUSCLE_TRANSLATION_KEY[muscle])}
                  selected={false}
                  style={[styles.chipSecondary, { borderColor: theme.border, backgroundColor: theme.card }]}
                  textStyle={[styles.chipText, { color: theme.textSecondary }]}
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>

      <Svg width={size} height={figureHeight} viewBox="0 0 165 180">
        <G opacity={0.96}>
          <Circle cx="82.5" cy={24 + bodyY} r="12" fill={theme.text} opacity={0.92} />

          <Path
            d={`M60 ${40 + bodyY} C65 ${35 + bodyY}, 100 ${35 + bodyY}, 105 ${40 + bodyY} L110 ${80 + bodyY} C110 ${92 + bodyY}, 98 ${102 + bodyY}, 82.5 ${102 + bodyY} C67 ${102 + bodyY}, 55 ${92 + bodyY}, 55 ${80 + bodyY} Z`}
            fill={theme.text}
            opacity={0.82}
          />

          <Line x1="57" y1={48 + bodyY} x2={39} y2={76 + armDelta + bodyY} stroke={armColor} strokeWidth="8" strokeLinecap="round" />
          <Line x1="108" y1={48 + bodyY} x2={126} y2={76 + armDelta + bodyY} stroke={armColor} strokeWidth="8" strokeLinecap="round" />

          <Line x1="72" y1={102 + bodyY} x2={60} y2={148 + legDelta + bodyY} stroke={legColor} strokeWidth="9" strokeLinecap="round" />
          <Line x1="93" y1={102 + bodyY} x2={105} y2={148 - legDelta + bodyY} stroke={legColor} strokeWidth="9" strokeLinecap="round" />

          <Ellipse cx="71" cy={56 + bodyY} rx="9" ry="11" fill={chestColor} opacity={0.95} />
          <Ellipse cx="94" cy={56 + bodyY} rx="9" ry="11" fill={backColor} opacity={0.9} />
          <Ellipse cx="57" cy={49 + bodyY} rx="8" ry="7" fill={shoulderColor} opacity={0.9} />
          <Ellipse cx="108" cy={49 + bodyY} rx="8" ry="7" fill={shoulderColor} opacity={0.9} />
          <Ellipse cx="82.5" cy={81 + bodyY} rx={12 + pulse} ry={13 + pulse} fill={coreColor} opacity={corePulse} />
        </G>

        <Line x1="138" y1="34" x2="138" y2="132" stroke={theme.accent} strokeWidth="2.6" strokeLinecap="round" opacity={0.9} />
        <Path d={`M133 ${42 - armDelta * 0.1} L138 ${34 - armDelta * 0.1} L143 ${42 - armDelta * 0.1}`} stroke={theme.accent} strokeWidth="2.6" fill="none" />
        <Path d={`M133 ${124 + armDelta * 0.1} L138 ${132 + armDelta * 0.1} L143 ${124 + armDelta * 0.1}`} stroke={theme.accent} strokeWidth="2.6" fill="none" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  textCol: {
    flex: 1,
    paddingRight: 6,
    gap: 8,
  },
  title: {
    fontSize: 16,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  chipsGroup: {
    gap: 6,
  },
  chipsLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chipPrimary: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipSecondary: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 11,
  },
});
