import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import type { MuscleGroup } from "@/data/exercises";
import ExerciseCoachFigure, { ExerciseCoachTheme } from "@/components/ExerciseCoachFigure";
import { EXERCISE_MEDIA_REGISTRY, ExerciseMediaDefinition } from "@/data/exerciseMediaRegistry";
import { Chip } from "@/components/ui";
import { useLanguage } from "@/contexts/LanguageContext";
import { TranslationKey } from "@/lib/i18n";
import { Typography } from "@/constants/typography";

export type ExerciseMediaType = "auto" | "lottie" | "video" | "svg" | "coach";
type ResolvedMedia = "lottie" | "video" | "svg" | "coach";

const MUSCLE_TRANSLATION_KEY: Record<MuscleGroup, TranslationKey> = {
  chest: "chest",
  back: "backMuscle",
  shoulders: "shoulders",
  arms: "arms",
  core: "core",
  legs: "legs",
};

function resolvePreferredMedia(type: ExerciseMediaType, media: ExerciseMediaDefinition): ResolvedMedia {
  if (type === "lottie") return media.lottieAsset ? "lottie" : "coach";
  if (type === "video") return media.remoteVideoUrl ? "video" : "coach";
  if (type === "svg") return media.anatomicalSvg ? "svg" : "coach";
  if (type === "coach") return "coach";

  if (media.lottieAsset) return "lottie";
  if (media.remoteVideoUrl) return "video";
  if (media.anatomicalSvg) return "svg";
  return "coach";
}

export interface ExerciseMediaProps {
  exerciseId?: string;
  type?: ExerciseMediaType;
  size?: number;
  autoPlay?: boolean;
  loop?: boolean;
  isActive?: boolean;
  muscles?: MuscleGroup[];
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  title: string;
  subtitle: string;
  theme: ExerciseCoachTheme;
  highlightColor: string;
  style?: StyleProp<ViewStyle>;
}

export default function ExerciseMedia({
  exerciseId,
  type = "auto",
  size = 165,
  autoPlay = true,
  loop = true,
  isActive = true,
  muscles = [],
  primaryMuscles,
  secondaryMuscles,
  title,
  subtitle,
  theme,
  highlightColor,
  style,
}: ExerciseMediaProps) {
  const { t } = useLanguage();
  const isFocused = useIsFocused();
  const lottieRef = useRef<LottieView>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [lottieFailed, setLottieFailed] = useState(false);

  useEffect(() => {
    const sub = AppState.addEventListener("change", setAppState);
    return () => sub.remove();
  }, []);

  const media = useMemo(() => {
    if (!exerciseId) return {};
    return EXERCISE_MEDIA_REGISTRY[exerciseId] ?? {};
  }, [exerciseId]);

  const resolvedMedia = useMemo(() => resolvePreferredMedia(type, media), [type, media]);
  const shouldAnimate = autoPlay && isActive && isFocused && appState === "active";

  useEffect(() => {
    setLottieFailed(false);
  }, [exerciseId, resolvedMedia, media.lottieAsset]);

  const finalPrimary = primaryMuscles?.length
    ? primaryMuscles
    : media.primaryMuscles?.length
      ? media.primaryMuscles
      : muscles.length > 0
        ? [muscles[0]]
        : [];

  const finalSecondary = secondaryMuscles?.length
    ? secondaryMuscles
    : media.secondaryMuscles?.length
      ? media.secondaryMuscles
      : muscles.filter((muscle) => !finalPrimary.includes(muscle));

  const canUseLottie = resolvedMedia === "lottie" && !!media.lottieAsset && Platform.OS !== "web" && !lottieFailed;

  useEffect(() => {
    if (!canUseLottie || !lottieRef.current) return;
    if (shouldAnimate) {
      lottieRef.current.play();
    } else {
      lottieRef.current.pause();
    }
  }, [canUseLottie, shouldAnimate, loop, exerciseId]);

  if (canUseLottie) {
    const figureHeight = Math.max(154, Math.round(size * 1.08));
    return (
      <View style={style}>
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
                {finalPrimary.map((muscle) => (
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

            {finalSecondary.length > 0 ? (
              <View style={styles.chipsGroup}>
                <Text style={[styles.chipsLabel, { color: theme.textSecondary, fontFamily: Typography.labelTech }]}>
                  {t("exerciseMediaSecondaryMuscles")}
                </Text>
                <View style={styles.chipsRow}>
                  {finalSecondary.map((muscle) => (
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

          <View
            style={[
              styles.lottieWrap,
              {
                width: size,
                height: figureHeight,
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}
          >
            <LottieView
              ref={lottieRef}
              source={media.lottieAsset as any}
              autoPlay={shouldAnimate}
              loop={loop}
              style={{ width: size, height: figureHeight }}
              resizeMode="contain"
              onAnimationFailure={() => setLottieFailed(true)}
            />
          </View>
        </View>
      </View>
    );
  }

  if (resolvedMedia === "svg" && media.anatomicalSvg) {
    const AnatomyView = media.anatomicalSvg;
    return (
      <View style={style}>
        <AnatomyView
          size={size}
          theme={theme}
          highlightColor={highlightColor}
          animated={shouldAnimate}
        />
      </View>
    );
  }

  return (
    <View style={style}>
      <ExerciseCoachFigure
        muscles={muscles}
        primaryMuscles={finalPrimary}
        secondaryMuscles={finalSecondary}
        title={title}
        subtitle={subtitle}
        theme={theme}
        highlightColor={highlightColor}
        size={size}
        animated={shouldAnimate}
      />
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
  lottieWrap: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
