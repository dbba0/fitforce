import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, useColorScheme, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Typography } from "@/constants/typography";

type PostType = "workout" | "achievement" | "progress" | "update";

interface PostMetric {
  value: string;
  label: string;
}

export interface PostCardData {
  author: string;
  initials?: string;
  content: string;
  type: PostType;
  typeLabel?: string;
  badgeLabel?: string;
  badgeVariant?: "ember" | "mint" | "gold" | "sky";
  timeLabel?: string;
  subtitle?: string;
  workoutSummary?: PostMetric[];
  likeCount?: number;
  commentCount?: number;
  liked?: boolean;
}

interface PostCardProps {
  post: PostCardData;
  onLike?: () => void;
  onComment?: () => void;
  onDelete?: () => void;
  style?: StyleProp<ViewStyle>;
}

const TYPE_VARIANT: Record<PostType, "ember" | "mint" | "gold" | "sky"> = {
  workout: "ember",
  achievement: "gold",
  progress: "mint",
  update: "sky",
};

export function PostCard({ post, onLike, onComment, onDelete, style }: PostCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
      <View style={styles.header}>
        <View style={styles.authorWrap}>
          <Avatar
            name={post.author}
            initials={post.initials}
            size={40}
            color={theme.accent}
            mode="tint"
            style={styles.avatar}
          />
          <View style={styles.authorMeta}>
            <Text style={[styles.author, { color: theme.text, fontFamily: Typography.title }]} numberOfLines={1}>
              {post.author}
            </Text>
            {post.subtitle ? (
              <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: Typography.bodyRegular }]} numberOfLines={1}>
                {post.subtitle}
              </Text>
            ) : null}
            {post.timeLabel ? (
              <Text style={[styles.time, { color: theme.textMuted, fontFamily: Typography.bodyRegular }]}>
                {post.timeLabel}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.headerMeta}>
          <Badge
            label={post.badgeLabel ?? post.typeLabel ?? post.type}
            variant={post.badgeVariant ?? TYPE_VARIANT[post.type]}
          />
          {onDelete ? (
            <Pressable onPress={onDelete} style={({ pressed }) => [{ opacity: pressed ? 0.74 : 1 }]}>
              <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {post.workoutSummary?.length ? (
        <View style={[styles.workoutSummary, { backgroundColor: theme.cardElevated }]}>
          {post.workoutSummary.slice(0, 3).map((metric, index) => (
            <View key={`metric-${index}`} style={styles.workoutMetric}>
              <Text style={[styles.workoutMetricValue, { color: theme.text, fontFamily: Typography.title }]}>
                {metric.value}
              </Text>
              <Text style={[styles.workoutMetricLabel, { color: theme.textMuted, fontFamily: Typography.labelTech }]}>
                {metric.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={[styles.content, { color: theme.textSecondary, fontFamily: Typography.body }]}>
        {post.content}
      </Text>

      <View style={styles.actions}>
        <Pressable onPress={onLike} style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.72 : 1 }]}> 
          <Ionicons name={post.liked ? "heart" : "heart-outline"} size={18} color={post.liked ? "#FF4D4D" : theme.textMuted} />
          <Text style={[styles.actionText, { color: theme.textMuted, fontFamily: Typography.bodySemiBold }]}>
            {post.likeCount ?? 0}
          </Text>
        </Pressable>

        <Pressable onPress={onComment} style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.72 : 1 }]}> 
          <Ionicons name="chatbubble-outline" size={18} color={theme.textMuted} />
          <Text style={[styles.actionText, { color: theme.textMuted, fontFamily: Typography.bodySemiBold }]}>
            {post.commentCount ?? 0}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  authorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  authorMeta: {
    flex: 1,
    gap: 2,
  },
  avatar: {
    borderWidth: 1,
  },
  author: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 12,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  time: {
    fontSize: 11,
  },
  content: {
    fontSize: 16,
    lineHeight: 34,
  },
  workoutSummary: {
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  workoutMetric: {
    flex: 1,
    gap: 2,
  },
  workoutMetricValue: {
    fontSize: 18,
  },
  workoutMetricLabel: {
    fontSize: 12,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 13,
  },
});
