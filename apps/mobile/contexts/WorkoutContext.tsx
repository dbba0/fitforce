import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { CustomProgram, getCustomPrograms, saveCustomPrograms } from "@/utils/customProgramStorage";

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  level: "beginner" | "intermediate" | "advanced";
  objective: "massMuscle" | "weightLoss" | "endurance" | "recomposition";
}

export interface Goal {
  id: string;
  type: "goalWeight" | "goalWorkoutsPerWeek" | "goalCalories" | "goalWaist";
  current: number;
  target: number;
  unit: string;
}

export interface WorkoutSession {
  id: string;
  clientId?: string | null;
  programId: string;
  date: string;
  durationMin: number;
  calories: number;
  completed: boolean;
  type?: "strength" | "cardio";
}

export interface ExerciseCustomization {
  sets?: number;
  reps?: number;
  weightKg?: number;
}

export interface WeeklyChallenge {
  weekStart: string;
  targetSessions: number;
  completedSessions: number;
  progress: number;
}

export type XpLevelId = "rookie" | "warrior" | "legend" | "elite";

export interface PlayerProgress {
  totalXp: number;
  level: XpLevelId;
  levelNameKey: "xpLevelRookie" | "xpLevelWarrior" | "xpLevelLegend" | "xpLevelElite";
  currentLevelMinXp: number;
  nextLevelMinXp: number | null;
  progressToNext: number;
  xpInLevel: number;
  xpNeededForNext: number;
}

export interface XpRewardSummary {
  gainedXp: number;
  previousLevel: XpLevelId;
  newLevel: XpLevelId;
  leveledUp: boolean;
  totalXp: number;
}

interface WorkoutContextValue {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  goals: Goal[];
  addGoal: (goal: Omit<Goal, "id">) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  sessions: WorkoutSession[];
  addSession: (session: Omit<WorkoutSession, "id">) => void;
  customizations: Record<string, ExerciseCustomization>;
  updateCustomization: (programId: string, exerciseId: string, updates: ExerciseCustomization) => void;
  resetCustomization: (programId: string, exerciseId: string) => void;
  getCustomization: (programId: string, exerciseId: string) => ExerciseCustomization;
  totalWorkouts: number;
  totalMinutes: number;
  totalCalories: number;
  totalCardioMinutes: number;
  totalCardioCalories: number;
  streakDays: number;
  weeklyProgress: number[];
  weeklyCardio: number[];
  weeklyChallenge: WeeklyChallenge;
  customPrograms: CustomProgram[];
  refreshCustomPrograms: () => Promise<CustomProgram[]>;
  persistCustomPrograms: (
    programs: CustomProgram[],
    meta?: { addedProgramId?: string; reason?: "create" | "update" | "duplicate" | "delete" | "sync" }
  ) => Promise<CustomProgram[]>;
  playerProgress: PlayerProgress;
  grantXpBatch: (input: { sessionCount?: number; prCount?: number; streakCount?: number }) => Promise<XpRewardSummary>;
  isLoaded: boolean;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

const DEFAULT_PROFILE: UserProfile = {
  name: "Athlete",
  age: 25,
  weight: 75,
  height: 175,
  level: "beginner",
  objective: "massMuscle",
};

const DEFAULT_GOALS: Goal[] = [];

const PROFILE_KEY = "@fitforce_profile";
const GOALS_KEY = "@fitforce_goals";
const SESSIONS_KEY = "@fitforce_sessions";
const CUSTOMIZATIONS_KEY = "@fitforce_customizations";
const WEEKLY_CHALLENGE_KEY = "@fitforce_weekly_challenge";
const XP_TOTAL_KEY = "@fitforce_xp_total";

const XP_PER_SESSION = 100;
const XP_PER_PR = 50;
const XP_PER_STREAK = 20;

const LEVELS: Array<{
  id: XpLevelId;
  minXp: number;
  nameKey: "xpLevelRookie" | "xpLevelWarrior" | "xpLevelLegend" | "xpLevelElite";
}> = [
  { id: "rookie", minXp: 0, nameKey: "xpLevelRookie" },
  { id: "warrior", minXp: 500, nameKey: "xpLevelWarrior" },
  { id: "legend", minXp: 1500, nameKey: "xpLevelLegend" },
  { id: "elite", minXp: 3000, nameKey: "xpLevelElite" },
];

function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + delta);
  return copy;
}

function toIsoDay(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getCurrentWeekStartIso(): string {
  return toIsoDay(startOfWeekMonday(new Date()));
}

function clampProgress(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function buildPlayerProgress(totalXp: number): PlayerProgress {
  const safeXp = Math.max(0, Math.floor(totalXp));
  const currentLevelIndex = LEVELS.findIndex((level, index) => {
    const next = LEVELS[index + 1];
    if (!next) return true;
    return safeXp >= level.minXp && safeXp < next.minXp;
  });
  const levelIndex = currentLevelIndex >= 0 ? currentLevelIndex : LEVELS.length - 1;
  const currentLevel = LEVELS[levelIndex];
  const nextLevel = LEVELS[levelIndex + 1] ?? null;
  const xpInLevel = safeXp - currentLevel.minXp;
  const xpNeededForNext = nextLevel ? Math.max(0, nextLevel.minXp - safeXp) : 0;
  const progressToNext = nextLevel
    ? clampProgress((safeXp - currentLevel.minXp) / Math.max(1, nextLevel.minXp - currentLevel.minXp))
    : 1;

  return {
    totalXp: safeXp,
    level: currentLevel.id,
    levelNameKey: currentLevel.nameKey,
    currentLevelMinXp: currentLevel.minXp,
    nextLevelMinXp: nextLevel?.minXp ?? null,
    progressToNext,
    xpInLevel,
    xpNeededForNext,
  };
}

function countCompletedSessionsForWeek(sessions: WorkoutSession[], weekStartIso: string): number {
  const weekStart = new Date(`${weekStartIso}T00:00:00`);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return sessions.filter((session) => {
    if (!session.completed) return false;
    const date = new Date(session.date);
    return date >= weekStart && date < weekEnd;
  }).length;
}

function buildWeeklyChallenge(
  sessions: WorkoutSession[],
  weekStartIso: string,
  targetSessions = 4
): WeeklyChallenge {
  const completedSessions = countCompletedSessionsForWeek(sessions, weekStartIso);
  return {
    weekStart: weekStartIso,
    targetSessions,
    completedSessions,
    progress: clampProgress(targetSessions > 0 ? completedSessions / targetSessions : 0),
  };
}

function dedupeSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const next: WorkoutSession[] = [];

  for (const s of sessions) {
    const id = String(s.id);
    const clientId = s.clientId ? String(s.clientId) : "";
    if (seenIds.has(id) || (clientId && seenIds.has(clientId))) continue;
    const key = `${s.programId}|${s.date}|${s.durationMin}|${s.calories}|${s.type || ""}`;
    if (seenKeys.has(key)) continue;
    seenIds.add(id);
    if (clientId) seenIds.add(clientId);
    seenKeys.add(key);
    next.push(s);
  }

  return next;
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [customizations, setCustomizations] = useState<Record<string, ExerciseCustomization>>({});
  const [customPrograms, setCustomPrograms] = useState<CustomProgram[]>([]);
  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge>(() =>
    buildWeeklyChallenge([], getCurrentWeekStartIso(), 4)
  );
  const [totalXp, setTotalXp] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const lastSyncedUserRef = useRef<string | null>(null);

  const refreshCustomPrograms = useCallback(async (): Promise<CustomProgram[]> => {
    try {
      const programs = await getCustomPrograms();
      setCustomPrograms(programs);
      console.log("[Context] Programs after save:", programs.length);
      return programs;
    } catch (error) {
      console.error("[WorkoutContext] Failed to sync custom programs", error);
      setCustomPrograms([]);
      return [];
    }
  }, []);

  const persistCustomPrograms = useCallback(
    async (
      programs: CustomProgram[],
      meta?: { addedProgramId?: string; reason?: "create" | "update" | "duplicate" | "delete" | "sync" }
    ): Promise<CustomProgram[]> => {
      await saveCustomPrograms(programs);
      setCustomPrograms(programs);

      console.log("[Context] Programs after save:", programs.length);
      if (meta?.addedProgramId) {
        const addedProgram = programs.find((program) => program.id === meta.addedProgramId);
        console.log("[Context] Added program:", addedProgram
          ? {
              id: addedProgram.id,
              title: addedProgram.title,
              mode: addedProgram.mode,
              days: addedProgram.days.length,
              estimatedMinutes: addedProgram.estimatedMinutes,
            }
          : { id: meta.addedProgramId, found: false });
      }

      return programs;
    },
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const [p, g, s, c, wc, xpRaw] = await Promise.all([
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(GOALS_KEY),
          AsyncStorage.getItem(SESSIONS_KEY),
          AsyncStorage.getItem(CUSTOMIZATIONS_KEY),
          AsyncStorage.getItem(WEEKLY_CHALLENGE_KEY),
          AsyncStorage.getItem(XP_TOTAL_KEY),
        ]);
        const sessionsParsed = safeJsonParse<unknown>(s, []);
        const parsedSessions: WorkoutSession[] = Array.isArray(sessionsParsed)
          ? dedupeSessions(sessionsParsed as WorkoutSession[])
          : [];
        const profileParsed = safeJsonParse<UserProfile | null>(p, null);
        if (profileParsed && typeof profileParsed === "object") setProfile(profileParsed);
        const goalsParsed = safeJsonParse<unknown>(g, []);
        if (Array.isArray(goalsParsed)) setGoals(goalsParsed as Goal[]);
        if (s) setSessions(parsedSessions);
        const customParsed = safeJsonParse<Record<string, ExerciseCustomization> | null>(c, null);
        if (customParsed && typeof customParsed === "object" && !Array.isArray(customParsed)) {
          setCustomizations(customParsed);
        }
        const currentWeekStart = getCurrentWeekStartIso();
        if (wc) {
          const parsedChallenge = safeJsonParse<WeeklyChallenge | null>(wc, null);
          if (
            parsedChallenge &&
            typeof parsedChallenge === "object" &&
            typeof parsedChallenge.weekStart === "string"
          ) {
            const targetSessions = parsedChallenge.targetSessions > 0 ? parsedChallenge.targetSessions : 4;
            const sourceWeekStart =
              parsedChallenge.weekStart === currentWeekStart
                ? parsedChallenge.weekStart
                : currentWeekStart;
            setWeeklyChallenge(buildWeeklyChallenge(parsedSessions, sourceWeekStart, targetSessions));
          } else {
            setWeeklyChallenge(buildWeeklyChallenge(parsedSessions, currentWeekStart, 4));
          }
        } else {
          setWeeklyChallenge(buildWeeklyChallenge(parsedSessions, currentWeekStart, 4));
        }
        setTotalXp(Number(xpRaw ?? 0) || 0);
        await refreshCustomPrograms();
      } finally {
        setIsLoaded(true);
      }
    })();
  }, [refreshCustomPrograms]);

  useEffect(() => {
    if (!isLoaded || !isAuthenticated || !user) return;
    if (lastSyncedUserRef.current === user.id) return;
    lastSyncedUserRef.current = user.id;

    (async () => {
      try {
        const res = await apiRequest("GET", "/api/sessions");
        const data = await res.json();
        const serverSessions: WorkoutSession[] = (data.sessions || []).map((s: any) => ({
          id: s.id,
          clientId: s.clientId ?? null,
          programId: s.programId,
          date: s.date,
          durationMin: s.durationMin,
          calories: s.calories ?? 0,
          completed: s.completed ?? true,
          type: s.type || "strength",
        }));

        setSessions((localSessions) => {
          const serverIds = new Set(serverSessions.map((s) => s.id));
          const serverClientIds = new Set(serverSessions.map((s) => s.clientId).filter(Boolean) as string[]);
          const localOnly = localSessions.filter((s) => {
            if (serverIds.has(s.id)) return false;
            if (s.clientId && serverClientIds.has(s.clientId)) return false;
            return true;
          });

          for (const ls of localOnly) {
            apiRequest("POST", "/api/sessions", {
              programId: ls.programId,
              date: ls.date,
              durationMin: ls.durationMin,
              calories: ls.calories,
              completed: ls.completed,
              type: ls.type || "strength",
              clientId: ls.clientId || ls.id,
            }).catch(() => {});
          }

          const merged = dedupeSessions([...serverSessions, ...localOnly]);
          merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(merged));
          return merged;
        });
      } catch {
      }
    })();
  }, [isLoaded, isAuthenticated, user]);

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) return;
    lastSyncedUserRef.current = null;
    setSessions([]);
    AsyncStorage.removeItem(SESSIONS_KEY).catch(() => {});
  }, [authLoading, isAuthenticated]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const updated = { ...profile, ...updates };
    setProfile(updated);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  };

  const addGoal = async (goal: Omit<Goal, "id">) => {
    const newGoal = { ...goal, id: Date.now().toString() + Math.random().toString(36).substr(2, 6) };
    const updated = [...goals, newGoal];
    setGoals(updated);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const updated = goals.map((g) => (g.id === id ? { ...g, ...updates } : g));
    setGoals(updated);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  };

  const deleteGoal = async (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    setGoals(updated);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  };

  const addSession = async (session: Omit<WorkoutSession, "id">) => {
    const clientId = `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const newSession = { ...session, id: clientId, clientId };
    const updated = [newSession, ...sessions];
    setSessions(updated);
    await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));

    if (isAuthenticated && user) {
      try {
        const res = await apiRequest("POST", "/api/sessions", {
          programId: session.programId,
          date: session.date,
          durationMin: session.durationMin,
          calories: session.calories,
          completed: session.completed,
          type: session.type || "strength",
          clientId,
        });
        const data = await res.json();
        const serverSession = data?.session;
        if (serverSession?.id) {
          setSessions((prev) => {
            const next = prev.map((s) =>
              s.clientId === clientId || s.id === clientId
                ? { ...s, id: serverSession.id, clientId: serverSession.clientId ?? clientId }
                : s
            );
            AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
            return next;
          });
        }
      } catch {
      }
    }
  };

  const customKey = (programId: string, exerciseId: string) => `${programId}__${exerciseId}`;

  const updateCustomization = async (programId: string, exerciseId: string, updates: ExerciseCustomization) => {
    const key = customKey(programId, exerciseId);
    const updated = { ...customizations, [key]: { ...(customizations[key] ?? {}), ...updates } };
    setCustomizations(updated);
    await AsyncStorage.setItem(CUSTOMIZATIONS_KEY, JSON.stringify(updated));
  };

  const resetCustomization = async (programId: string, exerciseId: string) => {
    const key = customKey(programId, exerciseId);
    const updated = { ...customizations };
    delete updated[key];
    setCustomizations(updated);
    await AsyncStorage.setItem(CUSTOMIZATIONS_KEY, JSON.stringify(updated));
  };

  const getCustomization = (programId: string, exerciseId: string): ExerciseCustomization => {
    return customizations[customKey(programId, exerciseId)] ?? {};
  };

  const totalWorkouts = sessions.filter((s) => s.completed).length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMin, 0);
  const totalCalories = sessions.reduce((sum, s) => sum + s.calories, 0);
  const totalCardioMinutes = sessions.filter((s) => s.type === "cardio" && s.completed).reduce((sum, s) => sum + s.durationMin, 0);
  const totalCardioCalories = sessions.filter((s) => s.type === "cardio" && s.completed).reduce((sum, s) => sum + s.calories, 0);

  const streakDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let checkDate = new Date(today);

    const completedDates = new Set(
      sessions
        .filter((s) => s.completed)
        .map((s) => {
          const d = new Date(s.date);
          d.setHours(0, 0, 0, 0);
          return d.toISOString().split("T")[0];
        })
    );

    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (completedDates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [sessions]);

  const weeklyProgress = useMemo(() => {
    const days = [0, 1, 2, 3, 4, 5, 6];
    return days.map((offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - offset));
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split("T")[0];
      return sessions.filter((s) => {
        const sd = new Date(s.date);
        sd.setHours(0, 0, 0, 0);
        return sd.toISOString().split("T")[0] === dateStr && s.completed;
      }).length;
    });
  }, [sessions]);

  const weeklyCardio = useMemo(() => {
    const days = [0, 1, 2, 3, 4, 5, 6];
    return days.map((offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - offset));
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split("T")[0];
      return sessions.filter((s) => {
        const sd = new Date(s.date);
        sd.setHours(0, 0, 0, 0);
        return sd.toISOString().split("T")[0] === dateStr && s.completed && s.type === "cardio";
      }).reduce((sum, s) => sum + s.durationMin, 0);
    });
  }, [sessions]);

  useEffect(() => {
    if (!isLoaded) return;
    const currentWeekStart = getCurrentWeekStartIso();
    setWeeklyChallenge((prev) => {
      const targetSessions = prev.weekStart === currentWeekStart ? prev.targetSessions : 4;
      const next = buildWeeklyChallenge(sessions, currentWeekStart, targetSessions);
      if (
        prev.weekStart === next.weekStart &&
        prev.targetSessions === next.targetSessions &&
        prev.completedSessions === next.completedSessions &&
        prev.progress === next.progress
      ) {
        return prev;
      }
      return next;
    });
  }, [isLoaded, sessions]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(WEEKLY_CHALLENGE_KEY, JSON.stringify(weeklyChallenge)).catch(() => {});
  }, [isLoaded, weeklyChallenge]);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(XP_TOTAL_KEY, String(Math.max(0, Math.floor(totalXp)))).catch(() => {});
  }, [isLoaded, totalXp]);

  const playerProgress = useMemo(() => buildPlayerProgress(totalXp), [totalXp]);

  const grantXpBatch = useCallback(async ({
    sessionCount = 0,
    prCount = 0,
    streakCount = 0,
  }: {
    sessionCount?: number;
    prCount?: number;
    streakCount?: number;
  }): Promise<XpRewardSummary> => {
    const gainedXp =
      Math.max(0, sessionCount) * XP_PER_SESSION +
      Math.max(0, prCount) * XP_PER_PR +
      Math.max(0, streakCount) * XP_PER_STREAK;

    const previous = buildPlayerProgress(totalXp);
    if (gainedXp <= 0) {
      return {
        gainedXp: 0,
        previousLevel: previous.level,
        newLevel: previous.level,
        leveledUp: false,
        totalXp: previous.totalXp,
      };
    }

    const nextTotal = Math.max(0, Math.floor(totalXp + gainedXp));
    setTotalXp(nextTotal);
    const next = buildPlayerProgress(nextTotal);
    const leveledUp = LEVELS.findIndex((level) => level.id === next.level) >
      LEVELS.findIndex((level) => level.id === previous.level);

    return {
      gainedXp,
      previousLevel: previous.level,
      newLevel: next.level,
      leveledUp,
      totalXp: nextTotal,
    };
  }, [totalXp]);

  const value = useMemo(() => ({
    profile,
    updateProfile,
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    sessions,
    addSession,
    customizations,
    updateCustomization,
    resetCustomization,
    getCustomization,
    totalWorkouts,
    totalMinutes,
    totalCalories,
    totalCardioMinutes,
    totalCardioCalories,
    streakDays,
    weeklyProgress,
    weeklyCardio,
    weeklyChallenge,
    customPrograms,
    refreshCustomPrograms,
    persistCustomPrograms,
    playerProgress,
    grantXpBatch,
    isLoaded,
  }), [profile, goals, sessions, customizations, totalWorkouts, totalMinutes, totalCalories, totalCardioMinutes, totalCardioCalories, streakDays, weeklyProgress, weeklyCardio, weeklyChallenge, customPrograms, refreshCustomPrograms, persistCustomPrograms, playerProgress, grantXpBatch, isLoaded]);

  return (
    <WorkoutContext.Provider value={value}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used within WorkoutProvider");
  return ctx;
}
