import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  age: integer("age").default(25),
  weight: integer("weight").default(75),
  height: integer("height").default(175),
  level: text("level").default("beginner"),
  objective: text("objective").default("massMuscle"),
  bio: text("bio").default(""),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  type: text("type").notNull().default("update"),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  workoutData: jsonb("workout_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const likes = pgTable("likes", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  postId: varchar("post_id", { length: 36 }).notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("likes_post_user_unique").on(table.postId, table.userId),
]);

export const privacySettings = pgTable("privacy_settings", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id).unique(),
  showProfile: boolean("show_profile").default(true),
  showGoals: boolean("show_goals").default(true),
  showAchievements: boolean("show_achievements").default(true),
  showStats: boolean("show_stats").default(true),
  showPosts: boolean("show_posts").default(true),
});

export const goals = pgTable("goals", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  title: text("title").notNull(),
  target: integer("target").notNull(),
  current: integer("current").default(0),
  unit: text("unit").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessionsLog = pgTable("sessions_log", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  programId: text("program_id").notNull(),
  date: text("date").notNull(),
  durationMin: integer("duration_min").notNull(),
  calories: integer("calories").default(0),
  completed: boolean("completed").default(true),
  type: text("type").default("strength"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  passwordHash: true,
  displayName: true,
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1).max(50),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type PrivacySettings = typeof privacySettings.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type SessionLog = typeof sessionsLog.$inferSelect;
