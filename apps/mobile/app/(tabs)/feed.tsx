import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkout } from "@/contexts/WorkoutContext";
import {
  BottomSheet,
  Card,
  EmptyState,
  IconButton,
  PillTabs,
  PostCard,
  PrimaryButton,
  SkeletonCard,
  SectionLabel,
} from "@/components/ui";
import { apiRequest, queryClient } from "@/lib/query-client";
import { TranslationKey } from "@/lib/i18n";
import { Colors } from "@/constants/colors";
import { Typography } from "@/constants/typography";
import { PROGRAMS } from "@/data/programs";

type PostType = "workout" | "achievement" | "progress" | "update";

type FeedPost = {
  id: string;
  type: PostType;
  content: string;
  workoutData?: {
    durationMin?: number;
    calories?: number;
    programId?: string;
    type?: string;
  } | null;
  createdAt: string;
  author?: {
    id?: string;
    displayName?: string;
  } | null;
  likeCount?: number;
  likedByMe?: boolean;
};

const TYPE_VARIANT: Record<PostType, "ember" | "mint" | "gold" | "sky"> = {
  workout: "ember",
  achievement: "gold",
  progress: "mint",
  update: "sky",
};

function getInitials(name: string): string {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((item) => item[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function timeAgo(dateStr: string, t: (key: TranslationKey) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.max(0, Math.floor((now - then) / 60000));
  if (diffMin < 1) return t("justNow");
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return `${Math.floor(diffD / 7)}w`;
}

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

function FeedPostItem({ post }: { post: FeedPost }) {
  const { t } = useLanguage();
  const { user } = useAuth();

  const isOwnPost = user?.id && post.author?.id && user.id === post.author.id;
  const authorName = post.author?.displayName || t("unknownUser");

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/posts/${post.id}/like`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/posts/${post.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    },
  });

  const workoutSummary = useMemo(() => {
    if (!post.workoutData) return undefined;

    const program = PROGRAMS.find((item) => item.id === post.workoutData?.programId);
    const programLabel = program ? t(program.nameKey as TranslationKey) : t("workout");

    return [
      {
        value: `${post.workoutData.durationMin ?? 0} ${t("minutes")}`,
        label: t("sessionDurationLabel"),
      },
      {
        value: `${post.workoutData.calories ?? 0} ${t("kcal")}`,
        label: t("sessionBurnedLabel"),
      },
      {
        value: programLabel,
        label: t("programs"),
      },
    ];
  }, [post.workoutData, t]);

  return (
    <PostCard
      post={{
        author: authorName,
        initials: getInitials(authorName),
        content: post.content,
        type: post.type,
        typeLabel: t(post.type as TranslationKey),
        badgeLabel: t(post.type as TranslationKey).toUpperCase(),
        badgeVariant: TYPE_VARIANT[post.type],
        timeLabel: timeAgo(post.createdAt, t),
        workoutSummary,
        likeCount: post.likeCount || 0,
        commentCount: 0,
        liked: !!post.likedByMe,
      }}
      onLike={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        likeMutation.mutate();
      }}
      onComment={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onDelete={
        isOwnPost
          ? () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              deleteMutation.mutate();
            }
          : undefined
      }
      style={styles.postCard}
    />
  );
}

function GuestPrompt() {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? webTopPadding + 16 : insets.top + 16 }]}> 
        <Text
          style={[styles.title, { color: theme.text, fontFamily: Typography.titleStrong }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {t("communityTitle")}
        </Text>
      </View>

      <View style={styles.guestPromptWrap}>
        <Ionicons name="lock-closed-outline" size={48} color={theme.textMuted} />
        <Text style={[styles.guestPromptTitle, { color: theme.text, fontFamily: Typography.title }]}>
          {t("loginToAccess")}
        </Text>
        <Text style={[styles.guestPromptText, { color: theme.textSecondary, fontFamily: Typography.bodyRegular }]}>
          {t("guestModePrompt")}
        </Text>
        <PrimaryButton label={t("login")} onPress={() => logout()} style={styles.guestLoginBtn} />
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const { t } = useLanguage();
  const { isGuest, user } = useAuth();
  const { sessions } = useWorkout();
  const searchParams = useLocalSearchParams<{
    autoPostToken?: string | string[];
    autoPostType?: string | string[];
    autoPostProgramId?: string | string[];
    autoPostDuration?: string | string[];
    autoPostCalories?: string | string[];
    autoPostExercises?: string | string[];
    autoPostPrCount?: string | string[];
    autoPostContent?: string | string[];
  }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  const lastAutoTokenRef = useRef<string | null>(null);

  const [composerVisible, setComposerVisible] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState<PostType>("workout");
  const [includeLatestSession, setIncludeLatestSession] = useState(true);
  const [prefilledWorkoutData, setPrefilledWorkoutData] = useState<FeedPost["workoutData"] | null>(null);
  const [composerPrefilled, setComposerPrefilled] = useState(false);
  const [localPosts, setLocalPosts] = useState<FeedPost[]>([]);

  const { data, isLoading, refetch } = useQuery<{ posts: FeedPost[] }>({
    queryKey: ["/api/feed"],
  });

  const latestSession = useMemo(() => {
    if (!sessions?.length) return null;
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted[0] ?? null;
  }, [sessions]);

  const latestSessionPreview = useMemo(() => {
    if (!latestSession) return null;
    const program = PROGRAMS.find((item) => item.id === latestSession.programId);
    const programLabel = program ? t(program.nameKey as TranslationKey) : t("workout");
    return {
      title: `${programLabel} · ${latestSession.durationMin} ${t("minutes")} · ${latestSession.calories} ${t("kcal")}`,
      subtitle: t("feedSessionTapInclude"),
      workoutData: {
        programId: latestSession.programId,
        durationMin: latestSession.durationMin,
        calories: latestSession.calories,
        type: latestSession.type || "strength",
      },
    };
  }, [latestSession, t]);

  const prefilledSessionPreview = useMemo(() => {
    if (!prefilledWorkoutData) return null;
    const program = PROGRAMS.find((item) => item.id === prefilledWorkoutData.programId);
    const programLabel = program ? t(program.nameKey as TranslationKey) : t("workout");
    return {
      title: `${programLabel} · ${prefilledWorkoutData.durationMin ?? 0} ${t("minutes")} · ${prefilledWorkoutData.calories ?? 0} ${t("kcal")}`,
      subtitle: t("feedAutoPostReady"),
    };
  }, [prefilledWorkoutData, t]);

  useEffect(() => {
    const autoToken = readParam(searchParams.autoPostToken);
    if (!autoToken || lastAutoTokenRef.current === autoToken) return;
    lastAutoTokenRef.current = autoToken;

    const content = readParam(searchParams.autoPostContent) ?? "";
    const programId = readParam(searchParams.autoPostProgramId);
    const duration = Number(readParam(searchParams.autoPostDuration) ?? 0);
    const calories = Number(readParam(searchParams.autoPostCalories) ?? 0);

    setPostType("workout");
    setPostContent(content);
    setComposerVisible(true);
    setComposerPrefilled(true);
    setIncludeLatestSession(false);

    if (programId && Number.isFinite(duration) && Number.isFinite(calories)) {
      setPrefilledWorkoutData({
        programId,
        durationMin: Math.max(0, Math.round(duration)),
        calories: Math.max(0, Math.round(calories)),
        type: "strength",
      });
    } else {
      setPrefilledWorkoutData(null);
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [searchParams]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        type: postType,
        content: postContent,
      };

      if (postType === "workout") {
        if (prefilledWorkoutData) {
          payload.workoutData = prefilledWorkoutData;
        } else if (includeLatestSession && latestSessionPreview?.workoutData) {
          payload.workoutData = latestSessionPreview.workoutData;
        }
      }

      const res = await apiRequest("POST", "/api/posts", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      setComposerVisible(false);
      setPostContent("");
      setPostType("workout");
      setIncludeLatestSession(true);
      setPrefilledWorkoutData(null);
      setComposerPrefilled(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      const localPost: FeedPost = {
        id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        type: postType,
        content: postContent,
        workoutData:
          postType === "workout"
            ? prefilledWorkoutData ?? (includeLatestSession ? latestSessionPreview?.workoutData ?? null : null)
            : null,
        createdAt: new Date().toISOString(),
        author: {
          id: user?.id ?? "local-user",
          displayName: user?.displayName ?? t("unknownUser"),
        },
        likeCount: 0,
        likedByMe: false,
      };
      setLocalPosts((prev) => [localPost, ...prev]);
      setComposerVisible(false);
      setPostContent("");
      setPostType("workout");
      setIncludeLatestSession(true);
      setPrefilledWorkoutData(null);
      setComposerPrefilled(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const posts = useMemo(() => [...localPosts, ...(data?.posts || [])], [data?.posts, localPosts]);

  const typeTabs = useMemo(
    () =>
      (["workout", "achievement", "progress", "update"] as PostType[]).map((type) => ({
        key: type,
        label: t(type as TranslationKey),
      })),
    [t]
  );

  const openComposer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setComposerPrefilled(false);
    setPrefilledWorkoutData(null);
    setIncludeLatestSession(true);
    setComposerVisible(true);
  };

  const renderPost = useCallback(({ item }: { item: FeedPost }) => <FeedPostItem post={item} />, []);

  if (isGuest) {
    return <GuestPrompt />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? webTopPadding + 14 : insets.top + 14 }]}> 
        <Text
          style={[styles.title, { color: theme.text, fontFamily: Typography.titleStrong }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {t("communityTitle")}
        </Text>
        <IconButton icon="add" size={48} onPress={openComposer} />
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: Platform.OS === "web" ? 34 + 88 : 104,
          gap: 14,
          flexGrow: posts.length === 0 ? 1 : undefined,
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonList}>
              {Array.from({ length: 3 }).map((_, idx) => (
                <SkeletonCard key={`feed-skeleton-${idx}`} height={168} style={styles.skeletonCard} />
              ))}
            </View>
          ) : (
            <EmptyState
              iconName="chatbubbles-outline"
              title={t("noPostsYet")}
              description={t("shareYourJourney")}
            />
          )
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.accent} />}
        showsVerticalScrollIndicator={false}
      />

      <BottomSheet
        visible={composerVisible}
        onClose={() => {
          setComposerVisible(false);
          setComposerPrefilled(false);
          setPrefilledWorkoutData(null);
          setIncludeLatestSession(true);
        }}
        title={t("newPost")}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.sheetContent} keyboardVerticalOffset={0}>
          <SectionLabel>{t("feedPostTypeLabel")}</SectionLabel>

          <PillTabs tabs={typeTabs} active={postType} onChange={setPostType} style={styles.typeTabs} />

          {composerPrefilled ? (
            <Text style={[styles.prefilledHint, { color: theme.textSecondary, fontFamily: Typography.bodyRegular }]}>
              {t("feedAutoPostHint")}
            </Text>
          ) : null}

          {postType === "workout" ? (
            prefilledSessionPreview ? (
              <View style={styles.sessionCardWrap}>
                <Card style={[styles.sessionCard, { borderColor: `${theme.accent}77` }]}> 
                  <View style={[styles.sessionIcon, { backgroundColor: `${theme.accent}22` }]}> 
                    <Ionicons name="sparkles-outline" size={18} color={theme.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sessionTitle, { color: theme.text, fontFamily: Typography.title }]} numberOfLines={1}>
                      {prefilledSessionPreview.title}
                    </Text>
                    <Text style={[styles.sessionSubtitle, { color: theme.textMuted, fontFamily: Typography.bodyRegular }]}>
                      {prefilledSessionPreview.subtitle}
                    </Text>
                  </View>
                </Card>
              </View>
            ) : latestSessionPreview ? (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIncludeLatestSession((prev) => !prev);
                }}
                style={({ pressed }) => [
                  styles.sessionCardWrap,
                  {
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
              >
                <Card style={[styles.sessionCard, { borderColor: includeLatestSession ? `${theme.accent}66` : theme.border }]}> 
                  <View style={[styles.sessionIcon, { backgroundColor: `${theme.accent}22` }]}> 
                    <Ionicons name="barbell-outline" size={18} color={theme.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sessionTitle, { color: theme.text, fontFamily: Typography.title }]} numberOfLines={1}>
                      {latestSessionPreview.title}
                    </Text>
                    <Text style={[styles.sessionSubtitle, { color: theme.textMuted, fontFamily: Typography.bodyRegular }]}>
                      {includeLatestSession ? t("feedSessionIncluded") : t("feedSessionExcluded")}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            ) : (
              <Text style={[styles.noSessionText, { color: theme.textMuted, fontFamily: Typography.bodyRegular }]}>
                {t("feedNoRecentSession")}
              </Text>
            )
          ) : null}

          <TextInput
            value={postContent}
            onChangeText={setPostContent}
            placeholder={t("feedComposerPlaceholder")}
            placeholderTextColor={theme.textMuted}
            multiline
            textAlignVertical="top"
            style={[
              styles.contentInput,
              {
                backgroundColor: theme.cardElevated,
                borderColor: theme.border,
                color: theme.text,
                fontFamily: Typography.body,
              },
            ]}
          />

          <PrimaryButton
            label={t("feedPostToCommunity")}
            loading={createMutation.isPending}
            disabled={!postContent.trim() || createMutation.isPending}
            onPress={() => {
              Keyboard.dismiss();
              createMutation.mutate();
            }}
            style={styles.publishBtn}
          />
        </KeyboardAvoidingView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: {
    flexShrink: 1,
    marginRight: 12,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -0.8,
  },
  postCard: {
    borderRadius: 24,
  },
  skeletonList: {
    gap: 14,
    paddingTop: 4,
  },
  skeletonCard: {
    borderRadius: 24,
  },
  sheetContent: {
    gap: 12,
  },
  typeTabs: {
    flexWrap: "wrap",
  },
  prefilledHint: {
    fontSize: 12,
    marginTop: -2,
    marginBottom: 2,
  },
  sessionCardWrap: {
    marginTop: 2,
  },
  sessionCard: {
    borderRadius: 18,
    borderLeftWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sessionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionTitle: {
    fontSize: 15,
  },
  sessionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  noSessionText: {
    fontSize: 13,
  },
  contentInput: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 21,
    marginTop: 2,
  },
  publishBtn: {
    marginTop: 6,
    marginBottom: 2,
  },
  guestPromptWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  guestPromptTitle: { fontSize: 20, textAlign: "center" },
  guestPromptText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  guestLoginBtn: {
    marginTop: 8,
    minWidth: 160,
  },
});
