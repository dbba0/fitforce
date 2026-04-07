import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import { useAppTheme } from "@/hooks";
import { apiRequest } from "@/lib/query-client";
import { Typography } from "@/constants/typography";

const BG = "#111111";
const SURFACE = "#181818";
const ACCENT = "#FF5500";
const MEDIA_HEIGHT = 260;

type ExerciseDetail = {
  id?: string;
  title?: string;
  name?: string;
  muscleGroup?: string;
  exerciseType?: string | string[];
  difficulty?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  instructions?: string[];
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
};

type ExerciseResponse = {
  data?: ExerciseDetail;
  exercise?: ExerciseDetail;
} & ExerciseDetail;

function extractExercise(payload: ExerciseResponse): ExerciseDetail {
  return payload.data ?? payload.exercise ?? payload;
}

function toStringArray(value: string | string[] | undefined | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return [value];
}

// ─── Media block ─────────────────────────────────────────────────────────────

type MediaBlockProps = {
  exercise: ExerciseDetail;
  onError: () => void;
};

function MediaBlock({ exercise, onError }: MediaBlockProps) {
  if (exercise.videoUrl) {
    return (
      <Video
        source={{ uri: exercise.videoUrl }}
        style={{ height: 280, width: "100%" }}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
        useNativeControls={false}
        onError={onError}
      />
    );
  }

  if (exercise.thumbnailUrl) {
    return (
      <Image
        source={{ uri: exercise.thumbnailUrl }}
        style={{ height: 280, width: "100%" }}
        resizeMode="cover"
        onError={onError}
      />
    );
  }

  return (
    <View style={[styles.mediaFallback, { height: 280 }]}>
      <Text style={[styles.mediaFallbackText, { fontFamily: Typography.bodyRegular }]}>
        Vidéo non disponible
      </Text>
    </View>
  );
}

// ─── Tag chip ────────────────────────────────────────────────────────────────

function Tag({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <View style={[styles.tag, { backgroundColor: accent ? ACCENT : "#1A1A1A" }]}>
      <Text style={[styles.tagText, { fontFamily: Typography.labelTech }]}>{label}</Text>
    </View>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={[styles.sectionLabel, { fontFamily: Typography.labelTech }]}>{children}</Text>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ExerciseYMoveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const exerciseId = Array.isArray(id) ? id[0] : id;
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [exercise, setExercise] = useState<ExerciseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchExercise = useCallback(async () => {
    if (!exerciseId) return;
    setError(false);
    try {
      const res = await apiRequest("GET", `/api/exercises/${exerciseId}`);
      const payload: ExerciseResponse = await res.json();
      setExercise(extractExercise(payload));
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [exerciseId]);

  useEffect(() => {
    setIsLoading(true);
    void fetchExercise();
  }, [fetchExercise]);

  const paddingBottom =
    (Platform.OS === "web" ? 34 : insets.bottom) + 80; // room for sticky button

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: BG }]}>
        <ActivityIndicator color={ACCENT} size="large" />
      </View>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !exercise) {
    return (
      <View style={[styles.centerWrap, { backgroundColor: BG }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}>
          Impossible de charger cet exercice.
        </Text>
        <Pressable
          onPress={() => {
            setIsLoading(true);
            void fetchExercise();
          }}
          style={({ pressed }) => [styles.retryButton, { opacity: pressed ? 0.82 : 1 }]}
        >
          <Text style={[styles.retryLabel, { fontFamily: Typography.bodySemiBold }]}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  const title = exercise.title ?? exercise.name ?? "Exercice";
  const exerciseTypes = toStringArray(exercise.exerciseType);
  const primaryMuscles = toStringArray(exercise.primaryMuscles);
  const secondaryMuscles = toStringArray(exercise.secondaryMuscles);
  const instructions = toStringArray(exercise.instructions as any);

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom }}
      >
        {/* ── 1. Media block ── */}
        <MediaBlock
          exercise={exercise}
          onError={() => {
            void fetchExercise();
          }}
        />

        <View style={styles.content}>
          {/* ── 2. Title ── */}
          <Text style={[styles.title, { fontFamily: Typography.titleStrong }]}>{title}</Text>

          {/* ── 3. Tags ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsRow}
            style={styles.tagsScroll}
          >
            {exercise.muscleGroup ? (
              <Tag label={exercise.muscleGroup} accent />
            ) : null}
            {exerciseTypes.map((type) => (
              <Tag key={type} label={type} />
            ))}
            {exercise.difficulty ? (
              <Tag label={exercise.difficulty} />
            ) : null}
          </ScrollView>

          {/* ── 4. Muscles ── */}
          {(primaryMuscles.length > 0 || secondaryMuscles.length > 0) ? (
            <View style={styles.section}>
              {primaryMuscles.length > 0 ? (
                <>
                  <SectionLabel>MUSCLES PRINCIPAUX</SectionLabel>
                  {primaryMuscles.map((muscle) => (
                    <View key={muscle} style={styles.muscleRow}>
                      <View style={[styles.muscleDot, { backgroundColor: ACCENT }]} />
                      <Text style={[styles.muscleText, { color: colors.text, fontFamily: Typography.bodyRegular }]}>
                        {muscle}
                      </Text>
                    </View>
                  ))}
                </>
              ) : null}

              {secondaryMuscles.length > 0 ? (
                <View style={{ marginTop: primaryMuscles.length > 0 ? 12 : 0 }}>
                  <SectionLabel>MUSCLES SECONDAIRES</SectionLabel>
                  {secondaryMuscles.map((muscle) => (
                    <View key={muscle} style={styles.muscleRow}>
                      <View style={[styles.muscleDot, { backgroundColor: "#555" }]} />
                      <Text style={[styles.muscleText, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}>
                        {muscle}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* ── 5. Instructions ── */}
          {instructions.length > 0 ? (
            <View style={styles.section}>
              <SectionLabel>INSTRUCTIONS</SectionLabel>
              {instructions.map((step, index) => (
                <View
                  key={`step-${index}`}
                  style={styles.stepCard}
                >
                  <Text style={[styles.stepNumber, { fontFamily: Typography.titleStrong }]}>
                    {String(index + 1).padStart(2, "0")}
                  </Text>
                  <Text style={[styles.stepText, { color: "#E0E0E0", fontFamily: Typography.bodyRegular }]}>
                    {step}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* ── Sticky close button ── */}
      <View
        style={[
          styles.stickyBar,
          {
            paddingBottom: Platform.OS === "web" ? 16 : Math.max(insets.bottom, 16),
            backgroundColor: BG,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.88 : 1 }]}
        >
          <Text style={[styles.closeLabel, { fontFamily: Typography.bodyBold }]}>Fermer</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: ACCENT,
    borderRadius: 30,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryLabel: {
    color: "#FFFFFF",
    fontSize: 15,
  },
  mediaFallback: {
    height: MEDIA_HEIGHT,
    width: "100%",
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaFallbackText: {
    color: "#888888",
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    marginTop: 16,
  },
  tagsScroll: {
    flexGrow: 0,
    marginTop: 8,
  },
  tagsRow: {
    gap: 8,
    paddingRight: 4,
  },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: "#FFFFFF",
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "capitalize",
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    color: "#888888",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  muscleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  muscleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  muscleText: {
    fontSize: 14,
    lineHeight: 20,
    textTransform: "capitalize",
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  stepNumber: {
    color: ACCENT,
    fontSize: 16,
    lineHeight: 22,
    minWidth: 28,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  stickyBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#222222",
  },
  closeButton: {
    backgroundColor: ACCENT,
    borderRadius: 30,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  closeLabel: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});
