import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Ellipse, G, Line, Path } from "react-native-svg";
import type { MuscleGroup } from "@/data/exercises";

type ThemeShape = {
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  accent: string;
};

type Props = {
  muscles: MuscleGroup[];
  title: string;
  subtitle: string;
  theme: ThemeShape;
  highlightColor: string;
};

function partColor(active: boolean, theme: ThemeShape, highlightColor: string) {
  return active ? highlightColor : theme.textSecondary;
}

type MotionType = "upper" | "lower" | "core";

export default function ExerciseCoachFigure({
  muscles,
  title,
  subtitle,
  theme,
  highlightColor,
}: Props) {
  const active = useMemo(() => new Set(muscles), [muscles]);
  const chestColor = partColor(active.has("chest"), theme, highlightColor);
  const backColor = partColor(active.has("back"), theme, highlightColor);
  const shoulderColor = partColor(active.has("shoulders"), theme, highlightColor);
  const armColor = partColor(active.has("arms"), theme, highlightColor);
  const coreColor = partColor(active.has("core"), theme, highlightColor);
  const legColor = partColor(active.has("legs"), theme, highlightColor);

  const motionType: MotionType = useMemo(() => {
    if (active.has("legs")) return "lower";
    if (active.has("core") && !active.has("arms") && !active.has("chest") && !active.has("back")) return "core";
    return "upper";
  }, [active]);

  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 3), 500);
    return () => clearInterval(id);
  }, []);

  const pulse = frame === 1 ? 1 : 0;
  const bodyY = motionType === "lower" ? (frame === 1 ? 4 : 0) : 0;
  const armDelta = motionType === "upper" ? (frame === 1 ? -10 : frame === 2 ? 6 : 0) : 0;
  const legDelta = motionType === "lower" ? (frame === 1 ? 10 : frame === 2 ? -4 : 0) : 0;
  const corePulse = motionType === "core" ? (frame === 1 ? 1 : 0.4) : 0.4;

  return (
    <LinearGradient
      colors={[`${highlightColor}22`, `${theme.card}`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrapper, { borderColor: `${highlightColor}55` }]}
    >
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>{title}</Text>
        <Text numberOfLines={3} style={[styles.subtitle, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
          {subtitle}
        </Text>
        <Text style={[styles.motionHint, { color: theme.accent, fontFamily: "Outfit_600SemiBold" }]}>
          {motionType === "lower" ? "Animation: squat/fente" : motionType === "core" ? "Animation: gainage/respiration" : "Animation: push/pull"}
        </Text>
        <View style={styles.badgesRow}>
          {muscles.slice(0, 3).map((m) => (
            <View key={m} style={[styles.badge, { backgroundColor: `${highlightColor}22`, borderColor: `${highlightColor}66` }]}>
              <Text style={[styles.badgeText, { color: theme.text, fontFamily: "Outfit_500Medium" }]}>{m}</Text>
            </View>
          ))}
        </View>
      </View>
      <Svg width={165} height={180} viewBox="0 0 165 180">
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  textCol: {
    flex: 1,
    paddingRight: 6,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  motionHint: {
    marginTop: 6,
    fontSize: 12,
  },
  badgesRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    textTransform: "capitalize",
  },
});
