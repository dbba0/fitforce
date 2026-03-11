import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";

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

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [customizations, setCustomizations] = useState<Record<string, ExerciseCustomization>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const lastSyncedUserRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, g, s, c] = await Promise.all([
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(GOALS_KEY),
          AsyncStorage.getItem(SESSIONS_KEY),
          AsyncStorage.getItem(CUSTOMIZATIONS_KEY),
        ]);
        if (p) setProfile(JSON.parse(p));
        if (g) setGoals(JSON.parse(g));
        if (s) setSessions(JSON.parse(s));
        if (c) setCustomizations(JSON.parse(c));
      } catch {
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

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
    if (!user) {
      lastSyncedUserRef.current = null;
      setSessions([]);
      AsyncStorage.removeItem(SESSIONS_KEY);
    }
  }, [user]);

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
    isLoaded,
  }), [profile, goals, sessions, customizations, totalWorkouts, totalMinutes, totalCalories, totalCardioMinutes, totalCardioCalories, streakDays, weeklyProgress, weeklyCardio, isLoaded]);

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
