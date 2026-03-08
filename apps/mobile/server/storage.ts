import { eq, desc, and, sql, count } from "drizzle-orm";
import { db } from "./db";
import {
  users, posts, likes, privacySettings, goals, sessionsLog,
  type User, type Post, type PrivacySettings, type Goal, type SessionLog,
} from "@shared/schema";

export async function createUser(email: string, passwordHash: string, displayName: string): Promise<User> {
  const [user] = await db.insert(users).values({ email, passwordHash, displayName }).returning();
  await db.insert(privacySettings).values({ userId: user.id });
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export async function updateUser(id: string, data: Partial<{
  displayName: string; age: number; weight: number; height: number;
  level: string; objective: string; bio: string; avatarUrl: string;
}>): Promise<User | undefined> {
  const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
  return user;
}

export async function getPrivacySettings(userId: string): Promise<PrivacySettings | undefined> {
  const [ps] = await db.select().from(privacySettings).where(eq(privacySettings.userId, userId)).limit(1);
  return ps;
}

export async function updatePrivacySettings(userId: string, data: Partial<{
  showProfile: boolean; showGoals: boolean; showAchievements: boolean;
  showStats: boolean; showPosts: boolean;
}>): Promise<PrivacySettings | undefined> {
  const [ps] = await db.update(privacySettings).set(data).where(eq(privacySettings.userId, userId)).returning();
  return ps;
}

export async function createPost(userId: string, type: string, content: string, imageUrl?: string, workoutData?: any): Promise<Post> {
  const [post] = await db.insert(posts).values({ userId, type, content, imageUrl, workoutData }).returning();
  return post;
}

export async function deletePost(id: string, userId: string): Promise<boolean> {
  const result = await db.delete(posts).where(and(eq(posts.id, id), eq(posts.userId, userId)));
  return true;
}

export async function getFeed(limit: number = 20, offset: number = 0, currentUserId?: string) {
  const feedPosts = await db.select().from(posts).orderBy(desc(posts.createdAt)).limit(limit).offset(offset);

  const enriched = await Promise.all(feedPosts.map(async (post) => {
    const [author] = await db.select({
      id: users.id,
      displayName: users.displayName,
      level: users.level,
    }).from(users).where(eq(users.id, post.userId)).limit(1);

    const privacy = await getPrivacySettings(post.userId);
    if (privacy && !privacy.showPosts && post.userId !== currentUserId) return null;

    const [likeCount] = await db.select({ count: count() }).from(likes).where(eq(likes.postId, post.id));
    let likedByMe = false;
    if (currentUserId) {
      const [myLike] = await db.select().from(likes).where(and(eq(likes.postId, post.id), eq(likes.userId, currentUserId))).limit(1);
      likedByMe = !!myLike;
    }

    return {
      ...post,
      author: author || { id: post.userId, displayName: "Unknown", level: "beginner" },
      likeCount: likeCount?.count ?? 0,
      likedByMe,
    };
  }));

  return enriched.filter(Boolean);
}

export async function getUserPosts(userId: string, currentUserId?: string) {
  const userPosts = await db.select().from(posts).where(eq(posts.userId, userId)).orderBy(desc(posts.createdAt)).limit(50);

  const enriched = await Promise.all(userPosts.map(async (post) => {
    const [likeCount] = await db.select({ count: count() }).from(likes).where(eq(likes.postId, post.id));
    let likedByMe = false;
    if (currentUserId) {
      const [myLike] = await db.select().from(likes).where(and(eq(likes.postId, post.id), eq(likes.userId, currentUserId))).limit(1);
      likedByMe = !!myLike;
    }
    return { ...post, likeCount: likeCount?.count ?? 0, likedByMe };
  }));

  return enriched;
}

export async function toggleLike(postId: string, userId: string): Promise<boolean> {
  const [existing] = await db.select().from(likes).where(and(eq(likes.postId, postId), eq(likes.userId, userId))).limit(1);
  if (existing) {
    await db.delete(likes).where(eq(likes.id, existing.id));
    return false;
  } else {
    await db.insert(likes).values({ postId, userId });
    return true;
  }
}

export async function getGoals(userId: string): Promise<Goal[]> {
  return db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
}

export async function createGoal(userId: string, title: string, target: number, unit: string): Promise<Goal> {
  const [goal] = await db.insert(goals).values({ userId, title, target, unit }).returning();
  return goal;
}

export async function updateGoal(id: string, userId: string, data: Partial<{ title: string; target: number; current: number; unit: string }>): Promise<Goal | undefined> {
  const [goal] = await db.update(goals).set(data).where(and(eq(goals.id, id), eq(goals.userId, userId))).returning();
  return goal;
}

export async function deleteGoal(id: string, userId: string): Promise<boolean> {
  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
  return true;
}

export async function logSession(userId: string, data: {
  programId: string; date: string; durationMin: number; calories: number;
  completed: boolean; type: string;
}): Promise<SessionLog> {
  const [session] = await db.insert(sessionsLog).values({ userId, ...data }).returning();
  return session;
}

export async function getSessions(userId: string): Promise<SessionLog[]> {
  return db.select().from(sessionsLog).where(eq(sessionsLog.userId, userId)).orderBy(desc(sessionsLog.createdAt));
}

export async function getUserStats(userId: string) {
  const sessions = await getSessions(userId);
  return {
    totalSessions: sessions.length,
    totalMinutes: sessions.reduce((s, se) => s + se.durationMin, 0),
    totalCalories: sessions.reduce((s, se) => s + (se.calories ?? 0), 0),
    cardioSessions: sessions.filter(s => s.type === "cardio").length,
    strengthSessions: sessions.filter(s => s.type === "strength" || !s.type).length,
  };
}

export async function getPublicProfile(userId: string, currentUserId?: string) {
  const user = await getUserById(userId);
  if (!user) return null;

  const privacy = await getPrivacySettings(userId);
  const isOwn = userId === currentUserId;

  const profile: any = {
    id: user.id,
    displayName: user.displayName,
    level: user.level,
    bio: user.bio,
    createdAt: user.createdAt,
  };

  if (privacy && !privacy.showProfile && !isOwn) {
    profile.isPrivate = true;
    return profile;
  }

  profile.age = user.age;
  profile.objective = user.objective;

  if (isOwn || !privacy || privacy.showStats) {
    profile.stats = await getUserStats(userId);
  }

  if (isOwn || !privacy || privacy.showGoals) {
    profile.goals = await getGoals(userId);
  }

  if (isOwn || !privacy || privacy.showPosts) {
    profile.posts = await getUserPosts(userId, currentUserId);
  }

  profile.privacy = {
    showProfile: privacy?.showProfile ?? true,
    showGoals: privacy?.showGoals ?? true,
    showAchievements: privacy?.showAchievements ?? true,
    showStats: privacy?.showStats ?? true,
    showPosts: privacy?.showPosts ?? true,
  };

  return profile;
}
