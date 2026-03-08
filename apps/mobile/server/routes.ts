import type { Express } from "express";
import { createServer, type Server } from "node:http";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema } from "@shared/schema";
import { authMiddleware, optionalAuth, signToken } from "./auth";
import * as storage from "./storage";

function sanitizeUser(user: any) {
  const { passwordHash, ...rest } = user;
  return rest;
}

export async function registerRoutes(app: Express): Promise<Server> {

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input" });
      }
      const { email, password, displayName } = parsed.data;
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser(email, passwordHash, displayName);
      const token = signToken({ userId: user.id, email: user.email });
      res.json({ user: sanitizeUser(user), token });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid input" });
      }
      const { email, password } = parsed.data;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = signToken({ userId: user.id, email: user.email });
      res.json({ user: sanitizeUser(user), token });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ user: sanitizeUser(user) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/auth/profile", authMiddleware, async (req, res) => {
    try {
      const { displayName, age, weight, height, level, objective, bio } = req.body;
      const user = await storage.updateUser(req.user!.userId, {
        displayName, age, weight, height, level, objective, bio,
      });
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ user: sanitizeUser(user) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/feed", optionalAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const feed = await storage.getFeed(limit, offset, req.user?.userId);
      res.json({ posts: feed });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/posts", authMiddleware, async (req, res) => {
    try {
      const { type, content, imageUrl, workoutData } = req.body;
      if (!content || !type) {
        return res.status(400).json({ error: "Content and type are required" });
      }
      const post = await storage.createPost(req.user!.userId, type, content, imageUrl, workoutData);
      res.json({ post });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/posts/:id", authMiddleware, async (req, res) => {
    try {
      const postId = String(req.params.id);
      await storage.deletePost(postId, req.user!.userId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/posts/:id/like", authMiddleware, async (req, res) => {
    try {
      const postId = String(req.params.id);
      const liked = await storage.toggleLike(postId, req.user!.userId);
      res.json({ liked });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/users/:id/profile", optionalAuth, async (req, res) => {
    try {
      const targetUserId = String(req.params.id);
      const profile = await storage.getPublicProfile(targetUserId, req.user?.userId);
      if (!profile) return res.status(404).json({ error: "User not found" });
      res.json({ profile });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/privacy", authMiddleware, async (req, res) => {
    try {
      const ps = await storage.getPrivacySettings(req.user!.userId);
      res.json({ privacy: ps });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/privacy", authMiddleware, async (req, res) => {
    try {
      const { showProfile, showGoals, showAchievements, showStats, showPosts } = req.body;
      const ps = await storage.updatePrivacySettings(req.user!.userId, {
        showProfile, showGoals, showAchievements, showStats, showPosts,
      });
      res.json({ privacy: ps });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/goals", authMiddleware, async (req, res) => {
    try {
      const g = await storage.getGoals(req.user!.userId);
      res.json({ goals: g });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/goals", authMiddleware, async (req, res) => {
    try {
      const { title, target, unit } = req.body;
      if (!title || !target) return res.status(400).json({ error: "Title and target required" });
      const goal = await storage.createGoal(req.user!.userId, title, target, unit || "");
      res.json({ goal });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/goals/:id", authMiddleware, async (req, res) => {
    try {
      const { title, target, current, unit } = req.body;
      const goalId = String(req.params.id);
      const goal = await storage.updateGoal(goalId, req.user!.userId, { title, target, current, unit });
      if (!goal) return res.status(404).json({ error: "Goal not found" });
      res.json({ goal });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/goals/:id", authMiddleware, async (req, res) => {
    try {
      const goalId = String(req.params.id);
      await storage.deleteGoal(goalId, req.user!.userId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/sessions", authMiddleware, async (req, res) => {
    try {
      const { programId, date, durationMin, calories, completed, type } = req.body;
      const session = await storage.logSession(req.user!.userId, {
        programId, date, durationMin, calories, completed: completed ?? true, type: type || "strength",
      });
      res.json({ session });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/sessions", authMiddleware, async (req, res) => {
    try {
      const sessions = await storage.getSessions(req.user!.userId);
      res.json({ sessions });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/users/:id/stats", optionalAuth, async (req, res) => {
    try {
      const targetUserId = String(req.params.id);
      const privacy = await storage.getPrivacySettings(targetUserId);
      if (privacy && !privacy.showStats && req.user?.userId !== targetUserId) {
        return res.json({ stats: null, private: true });
      }
      const stats = await storage.getUserStats(targetUserId);
      res.json({ stats });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
