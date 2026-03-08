import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Platform,
  useColorScheme,
  RefreshControl,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/query-client";
import { Colors } from "@/constants/colors";

type PostType = "workout" | "achievement" | "progress" | "update";

const POST_TYPE_ICONS: Record<PostType, keyof typeof Ionicons.glyphMap> = {
  workout: "barbell-outline",
  achievement: "trophy-outline",
  progress: "trending-up-outline",
  update: "chatbubble-outline",
};

const POST_TYPE_COLORS: Record<PostType, string> = {
  workout: "#FF6B2C",
  achievement: "#FFD700",
  progress: "#4CAF50",
  update: "#2196F3",
};

function timeAgo(dateStr: string, t: (k: any) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return t("justNow");
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  return `${Math.floor(diffD / 7)}w`;
}

function PostCard({ post, t, theme, language }: { post: any; t: any; theme: any; language: string }) {
  const { user } = useAuth();
  const isOwn = user?.id === post.author?.id;

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

  const postType = (post.type || "update") as PostType;
  const typeColor = POST_TYPE_COLORS[postType] || "#2196F3";
  const typeIcon = POST_TYPE_ICONS[postType] || "chatbubble-outline";

  const initials = (post.author?.displayName || "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[styles.postCard, { backgroundColor: theme.card }]}>
      <View style={styles.postHeader}>
        <Pressable
          onPress={() => {
            if (post.author?.id) {
              router.push({ pathname: "/user/[id]", params: { id: post.author.id } });
            }
          }}
          style={styles.postAuthorRow}
        >
          <LinearGradient
            colors={[typeColor, typeColor + "AA"]}
            style={styles.avatar}
          >
            <Text style={[styles.avatarText, { fontFamily: "Outfit_700Bold" }]}>{initials}</Text>
          </LinearGradient>
          <View style={styles.postAuthorInfo}>
            <Text style={[styles.postAuthorName, { color: theme.text, fontFamily: "Outfit_600SemiBold" }]}>
              {post.author?.displayName || "Unknown"}
            </Text>
            <View style={styles.postMetaRow}>
              <View style={[styles.typeBadge, { backgroundColor: typeColor + "20" }]}>
                <Ionicons name={typeIcon} size={10} color={typeColor} />
                <Text style={[styles.typeBadgeText, { color: typeColor, fontFamily: "Outfit_500Medium" }]}>
                  {t(postType)}
                </Text>
              </View>
              <Text style={[styles.postTime, { color: theme.textMuted, fontFamily: "Outfit_400Regular" }]}>
                {timeAgo(post.createdAt, t)}
              </Text>
            </View>
          </View>
        </Pressable>
        {isOwn && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              deleteMutation.mutate();
            }}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
          </Pressable>
        )}
      </View>

      <Text style={[styles.postContent, { color: theme.text, fontFamily: "Outfit_400Regular" }]}>
        {post.content}
      </Text>

      {post.workoutData && (
        <View style={[styles.workoutDataCard, { backgroundColor: theme.border }]}>
          <View style={styles.workoutDataRow}>
            <Ionicons name="time-outline" size={14} color={theme.accent} />
            <Text style={[styles.workoutDataText, { color: theme.text, fontFamily: "Outfit_500Medium" }]}>
              {post.workoutData.durationMin} {t("minutes")}
            </Text>
          </View>
          <View style={styles.workoutDataRow}>
            <Ionicons name="flame-outline" size={14} color={theme.accent} />
            <Text style={[styles.workoutDataText, { color: theme.text, fontFamily: "Outfit_500Medium" }]}>
              {post.workoutData.calories} {t("kcal")}
            </Text>
          </View>
          {post.workoutData.type && (
            <View style={styles.workoutDataRow}>
              <Ionicons name="barbell-outline" size={14} color={theme.accent} />
              <Text style={[styles.workoutDataText, { color: theme.text, fontFamily: "Outfit_500Medium" }]}>
                {post.workoutData.type === "cardio" ? t("cardio") : t("strength")}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.postActions}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            likeMutation.mutate();
          }}
          style={styles.likeBtn}
        >
          <Ionicons
            name={post.likedByMe ? "heart" : "heart-outline"}
            size={20}
            color={post.likedByMe ? "#FF4444" : theme.textMuted}
          />
          <Text style={[styles.likeCount, {
            color: post.likedByMe ? "#FF4444" : theme.textMuted,
            fontFamily: "Outfit_500Medium",
          }]}>
            {post.likeCount || 0}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function GuestPrompt({ t, theme, insets }: { t: any; theme: any; insets: any }) {
  const { logout } = useAuth();
  const webTopPadding = Platform.OS === "web" ? 67 : 0;
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? webTopPadding + 16 : insets.top + 16 }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Outfit_800ExtraBold" }]}>
          {t("feed")}
        </Text>
      </View>
      <View style={styles.guestPromptWrap}>
        <Ionicons name="lock-closed-outline" size={48} color={theme.textMuted} />
        <Text style={[styles.guestPromptTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
          {t("loginToAccess")}
        </Text>
        <Text style={[styles.guestPromptText, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
          {t("guestModePrompt")}
        </Text>
        <Pressable
          onPress={() => logout()}
          style={({ pressed }) => [styles.guestLoginBtn, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="log-in-outline" size={18} color="#fff" />
          <Text style={[styles.guestLoginBtnText, { fontFamily: "Outfit_700Bold" }]}>{t("login")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function FeedScreen() {
  const { t, language } = useLanguage();
  const { isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const webTopPadding = Platform.OS === "web" ? 67 : 0;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState<PostType>("update");

  const { data, isLoading, refetch } = useQuery<{ posts: any[] }>({
    queryKey: ["/api/feed"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/posts", {
        type: postType,
        content: postContent,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      setShowCreateModal(false);
      setPostContent("");
      setPostType("update");
    },
  });

  const posts = data?.posts || [];

  const renderPost = useCallback(({ item, index }: { item: any; index: number }) => (
    <PostCard post={item} t={t} theme={theme} language={language} />
  ), [t, theme, language]);

  if (isGuest) {
    return <GuestPrompt t={t} theme={theme} insets={insets} />;
  }

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <Ionicons name="chatbubbles-outline" size={48} color={theme.textMuted} />
      <Text style={[styles.emptyTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
        {t("noPostsYet")}
      </Text>
      <Text style={[styles.emptyText, { color: theme.textSecondary, fontFamily: "Outfit_400Regular" }]}>
        {t("shareYourJourney")}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? webTopPadding + 16 : insets.top + 16 }]}>
        <Text style={[styles.title, { color: theme.text, fontFamily: "Outfit_800ExtraBold" }]}>
          {t("feed")}
        </Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCreateModal(true);
          }}
          style={[styles.newPostBtn, { backgroundColor: theme.accent }]}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: Platform.OS === "web" ? 34 + 84 : 100,
          flexGrow: posts.length === 0 ? 1 : undefined,
        }}
        ListEmptyComponent={isLoading ? null : renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => refetch()}
            tintColor={theme.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card, paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text, fontFamily: "Outfit_700Bold" }]}>
                    {t("newPost")}
                  </Text>
                  <Pressable onPress={() => setShowCreateModal(false)}>
                    <Ionicons name="close" size={24} color={theme.textSecondary} />
                  </Pressable>
                </View>

                <View style={styles.typeSelector}>
                  {(["update", "workout", "achievement", "progress"] as PostType[]).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => {
                        setPostType(type);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: postType === type ? POST_TYPE_COLORS[type] + "20" : theme.border,
                          borderColor: postType === type ? POST_TYPE_COLORS[type] : "transparent",
                        },
                      ]}
                    >
                      <Ionicons
                        name={POST_TYPE_ICONS[type]}
                        size={14}
                        color={postType === type ? POST_TYPE_COLORS[type] : theme.textSecondary}
                      />
                      <Text style={[styles.typeChipText, {
                        color: postType === type ? POST_TYPE_COLORS[type] : theme.textSecondary,
                        fontFamily: "Outfit_500Medium",
                      }]}>
                        {t(type)}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <TextInput
                  style={[styles.postInput, {
                    color: theme.text,
                    backgroundColor: theme.background,
                    fontFamily: "Outfit_400Regular",
                  }]}
                  value={postContent}
                  onChangeText={setPostContent}
                  placeholder={t("shareYourJourney")}
                  placeholderTextColor={theme.textMuted}
                  multiline
                  textAlignVertical="top"
                  testID="postContent"
                />

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    createMutation.mutate();
                  }}
                  disabled={!postContent.trim() || createMutation.isPending}
                  style={({ pressed }) => [
                    styles.createBtn,
                    {
                      backgroundColor: postContent.trim() ? theme.accent : theme.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={[styles.createBtnText, { fontFamily: "Outfit_700Bold" }]}>
                    {t("publish")}
                  </Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingBottom: 12,
  },
  title: { fontSize: 32 },
  newPostBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  postCard: { borderRadius: 16, padding: 16, gap: 12 },
  postHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  postAuthorRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 14 },
  postAuthorInfo: { flex: 1, gap: 2 },
  postAuthorName: { fontSize: 14 },
  postMetaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  typeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  typeBadgeText: { fontSize: 10 },
  postTime: { fontSize: 11 },
  deleteBtn: { padding: 4 },
  postContent: { fontSize: 14, lineHeight: 20 },
  workoutDataCard: { borderRadius: 12, padding: 12, flexDirection: "row", gap: 16 },
  workoutDataRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  workoutDataText: { fontSize: 12 },
  postActions: { flexDirection: "row", alignItems: "center" },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  likeCount: { fontSize: 13 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 12 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 14, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 16 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 20 },
  typeSelector: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  typeChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  typeChipText: { fontSize: 12 },
  postInput: {
    borderRadius: 14, padding: 14,
    fontSize: 15, minHeight: 120, maxHeight: 200,
  },
  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 14,
  },
  createBtnText: { color: "#fff", fontSize: 15 },
  guestPromptWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 },
  guestPromptTitle: { fontSize: 20, textAlign: "center" },
  guestPromptText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  guestLoginBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 8 },
  guestLoginBtnText: { color: "#fff", fontSize: 16 },
});
