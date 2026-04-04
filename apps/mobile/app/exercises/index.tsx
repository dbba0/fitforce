import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/hooks";
import { apiRequest } from "@/lib/query-client";
import { Chip, PrimaryButton, SkeletonCard } from "@/components/ui";
import { Typography } from "@/constants/typography";

const PAGE_SIZE = 20;
const BG = "#111111";
const SURFACE = "#1A1A1A";

type Exercise = {
  id: string;
  name: string;
  muscleGroup?: string;
  exerciseType?: string;
  thumbnailUrl?: string | null;
};

type ExercisesResponse = {
  exercises?: Exercise[];
  data?: Exercise[];
  total?: number;
};

type MuscleGroupsResponse = {
  muscleGroups?: string[];
  data?: string[];
};

function buildExercisesUrl(muscleGroup: string | null, page: number): string {
  const params = new URLSearchParams();
  if (muscleGroup) params.set("muscleGroup", muscleGroup);
  params.set("limit", String(PAGE_SIZE));
  params.set("page", String(page));
  return `/api/exercises?${params.toString()}`;
}

function extractExercises(payload: ExercisesResponse): Exercise[] {
  const raw = payload.data ?? payload.exercises ?? (payload as any) ?? [];
  return (raw as any[]).map((item: any) => ({
    ...item,
    name: item.name ?? item.title ?? "",
    id: item.id ?? item.slug ?? "",
  }));
}

function extractMuscleGroups(payload: MuscleGroupsResponse): string[] {
  return payload.muscleGroups ?? payload.data ?? [];
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ExerciseSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <SkeletonCard height={178} lines={2} />
      <SkeletonCard height={178} lines={2} />
      <SkeletonCard height={178} lines={2} />
    </View>
  );
}

// ─── Exercise card ───────────────────────────────────────────────────────────

type ExerciseCardProps = {
  item: Exercise;
  refreshedUrl: string | null;
  onImageError: (id: string) => void;
  onPress: (id: string) => void;
};

function ExerciseCard({ item, refreshedUrl, onImageError, onPress }: ExerciseCardProps) {
  const thumbnailUrl = refreshedUrl ?? item.thumbnailUrl ?? null;

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.88 : 1 }]}
    >
      {thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.cardImage}
          resizeMode="cover"
          onError={() => onImageError(item.id)}
        />
      ) : (
        <View style={styles.cardImageFallback}>
          <Text style={styles.cardImageFallbackIcon}>🏋️</Text>
        </View>
      )}

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.tagRow}>
          {item.muscleGroup ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.muscleGroup}</Text>
            </View>
          ) : null}
          {item.exerciseType ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.exerciseType}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ExercisesScreen() {
  const { colors, layout } = useAppTheme();
  const insets = useSafeAreaInsets();
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const [muscleGroups, setMuscleGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // per-exercise refreshed thumbnailUrl keyed by exercise id
  const [refreshedUrls, setRefreshedUrls] = useState<Record<string, string>>({});

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Fetch muscle groups once on mount ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    apiRequest("GET", "/api/exercises/muscle-groups")
      .then((res) => res.json())
      .then((payload: MuscleGroupsResponse) => {
        if (cancelled) return;
        setMuscleGroups(extractMuscleGroups(payload));
      })
      .catch(() => {
        // non-critical — filters just won't show
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Core fetch helper ──────────────────────────────────────────────────────
  const fetchExercises = useCallback(
    async (group: string | null, nextPage: number, append: boolean) => {
      try {
        const url = buildExercisesUrl(group, nextPage);
        const res = await apiRequest("GET", url);
        const payload: ExercisesResponse = await res.json();
        const items = extractExercises(payload);

        if (!isMounted.current) return;

        setExercises((prev) => (append ? [...prev, ...items] : items));
        setHasMore(items.length === PAGE_SIZE);
        setError(null);
      } catch {
        if (!isMounted.current) return;
        setError("Impossible de charger les exercices.");
      }
    },
    []
  );

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    setPage(1);
    setHasMore(true);
    fetchExercises(selectedGroup, 1, false).finally(() => {
      if (isMounted.current) setIsLoading(false);
    });
  }, [selectedGroup, fetchExercises]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    setHasMore(true);
    await fetchExercises(selectedGroup, 1, false);
    if (isMounted.current) setIsRefreshing(false);
  }, [selectedGroup, fetchExercises]);

  // ── Load more ──────────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = page + 1;
    setIsLoadingMore(true);
    setPage(nextPage);
    await fetchExercises(selectedGroup, nextPage, true);
    if (isMounted.current) setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, page, selectedGroup, fetchExercises]);

  // ── Image error → re-fetch detail for fresh thumbnailUrl ──────────────────
  const handleImageError = useCallback((id: string) => {
    apiRequest("GET", `/api/exercises/${id}`)
      .then((res) => res.json())
      .then((payload: Exercise & { data?: Exercise }) => {
        const detail: Exercise = payload.data ?? payload;
        const freshUrl = detail.thumbnailUrl ?? null;
        if (freshUrl && isMounted.current) {
          setRefreshedUrls((prev) => ({ ...prev, [id]: freshUrl }));
        }
      })
      .catch(() => {
        // keep fallback icon
      });
  }, []);

  // ── Chip selection ─────────────────────────────────────────────────────────
  const handleSelectGroup = useCallback((group: string | null) => {
    setSelectedGroup(group);
    setRefreshedUrls({});
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  const paddingTop = Platform.OS === "web" ? webTopPadding : insets.top;
  const paddingHorizontal = Math.max(layout.screenPadding, 16);

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      {/* ── Fixed header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: paddingTop + 8,
            paddingHorizontal,
            backgroundColor: BG,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: Typography.titleStrong }]}>
          Exercices
        </Text>

        {/* ── Muscle group chips ── */}
        {muscleGroups.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}
          >
            <Chip
              label="Tous"
              selected={selectedGroup === null}
              onPress={() => handleSelectGroup(null)}
              selectedColor="#FF5500"
            />
            {muscleGroups.map((group) => (
              <Chip
                key={group}
                label={group}
                selected={selectedGroup === group}
                onPress={() => handleSelectGroup(group)}
                selectedColor="#FF5500"
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* ── Content ── */}
      {isLoading ? (
        <View style={[styles.skeletonContainer, { paddingHorizontal }]}>
          <ExerciseSkeleton />
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.textMuted} />
          <Text style={[styles.errorText, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}>
            {error}
          </Text>
          <PrimaryButton label="Réessayer" onPress={handleRefresh} style={styles.retryButton} />
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: paddingHorizontal - 6,
            paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24,
            gap: 12,
          }}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#FF5500"
              colors={["#FF5500"]}
              progressBackgroundColor={SURFACE}
            />
          }
          renderItem={({ item }) => (
            <ExerciseCard
              item={item}
              refreshedUrl={refreshedUrls[item.id] ?? null}
              onImageError={handleImageError}
              onPress={(id) => router.push(`/exercises/${id}` as any)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: Typography.bodyRegular }]}>
                Aucun exercice trouvé.
              </Text>
            </View>
          }
          ListFooterComponent={
            hasMore && exercises.length > 0 ? (
              <View style={[styles.loadMoreWrap, { paddingHorizontal: 6 }]}>
                <PrimaryButton
                  label={isLoadingMore ? "Chargement…" : "Charger plus"}
                  onPress={handleLoadMore}
                  loading={isLoadingMore}
                  disabled={isLoadingMore}
                />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    gap: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chipsRow: {
    gap: 8,
    paddingRight: 16,
  },
  skeletonContainer: {
    flex: 1,
    paddingTop: 12,
  },
  skeletonWrap: {
    gap: 12,
  },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 4,
    minWidth: 140,
  },
  columnWrapper: {
    gap: 12,
    paddingHorizontal: 6,
  },
  card: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  cardImageFallback: {
    width: "100%",
    height: 120,
    backgroundColor: SURFACE,
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageFallbackIcon: {
    fontSize: 32,
  },
  cardBody: {
    padding: 10,
    gap: 6,
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  tag: {
    backgroundColor: SURFACE,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagText: {
    color: "#888888",
    fontSize: 10,
    lineHeight: 14,
    textTransform: "capitalize",
  },
  emptyWrap: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  loadMoreWrap: {
    paddingTop: 8,
    paddingBottom: 4,
  },
});
