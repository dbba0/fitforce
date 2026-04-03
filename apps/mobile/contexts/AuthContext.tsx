import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { apiRequest, setAuthToken, getAuthToken, queryClient } from "@/lib/query-client";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  age: number;
  weight: number;
  height: number;
  level: string;
  objective: string;
  bio: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface LocalUserRecord extends AuthUser {
  passwordHash: string;
  isHashed: true;
}

function normalizeUser(raw: any): AuthUser {
  return {
    id: raw?.id || raw?._id || "",
    email: raw?.email || "",
    displayName: raw?.displayName || raw?.fullName || "",
    age: raw?.age ?? 0,
    weight: raw?.weight ?? raw?.weightKg ?? 0,
    height: raw?.height ?? raw?.heightCm ?? 0,
    level: raw?.level || "debutant",
    objective: raw?.objective || raw?.goalType || "recomposition",
    bio: raw?.bio || "",
    avatarUrl: raw?.avatarUrl || null,
    createdAt: raw?.createdAt || new Date().toISOString(),
  };
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /fetch failed|network request failed|timeout|abort|cancel/i.test(error.message);
}

const LOCAL_USERS_KEY = "@fitforce_local_users";
const LOCAL_SESSION_KEY = "@fitforce_local_session";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
}

function isHashedLocalUserRecord(raw: unknown): raw is LocalUserRecord {
  if (!raw || typeof raw !== "object") return false;
  const candidate = raw as Record<string, unknown>;
  return (
    candidate.isHashed === true &&
    typeof candidate.passwordHash === "string" &&
    candidate.passwordHash.length > 0 &&
    typeof candidate.id === "string" &&
    typeof candidate.email === "string"
  );
}

function sanitizeHashedLocalUser(raw: LocalUserRecord): LocalUserRecord {
  return {
    ...normalizeUser(raw),
    passwordHash: raw.passwordHash,
    isHashed: true,
  };
}

function toAuthUser(raw: LocalUserRecord): AuthUser {
  return normalizeUser(raw);
}

async function migrateLegacyLocalUsers(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(LOCAL_USERS_KEY);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      await AsyncStorage.removeItem(LOCAL_USERS_KEY);
      return false;
    }

    const secureUsers = parsed
      .filter((entry): entry is LocalUserRecord => isHashedLocalUserRecord(entry))
      .map(sanitizeHashedLocalUser);

    const hasLegacyRecords = secureUsers.length !== parsed.length;

    if (hasLegacyRecords) {
      await saveLocalUsers(secureUsers);
      const localSession = await getLocalSessionUser();
      if (localSession?.id?.startsWith("local_")) {
        await setLocalSessionUser(null);
      }
    }

    return hasLegacyRecords;
  } catch {
    await AsyncStorage.removeItem(LOCAL_USERS_KEY);
    return false;
  }
}

async function getLocalUsers(): Promise<LocalUserRecord[]> {
  const raw = await AsyncStorage.getItem(LOCAL_USERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is LocalUserRecord => isHashedLocalUserRecord(entry))
      .map(sanitizeHashedLocalUser);
  } catch {
    return [];
  }
}

async function saveLocalUsers(users: LocalUserRecord[]): Promise<void> {
  await AsyncStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

async function getLocalSessionUser(): Promise<AuthUser | null> {
  const raw = await AsyncStorage.getItem(LOCAL_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function setLocalSessionUser(user: AuthUser | null): Promise<void> {
  if (!user) {
    await AsyncStorage.removeItem(LOCAL_SESSION_KEY);
    return;
  }
  await AsyncStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
}

async function createLocalUser(email: string, password: string, displayName: string): Promise<LocalUserRecord> {
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  return {
    id: `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    email,
    passwordHash,
    isHashed: true,
    displayName,
    age: 0,
    weight: 0,
    height: 0,
    level: "debutant",
    objective: "recomposition",
    bio: "",
    avatarUrl: null,
    createdAt: now,
  };
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  continueAsGuest: () => void;
  updateProfile: (data: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isGuest: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  continueAsGuest: () => {},
  updateProfile: async () => ({ success: false }),
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      await migrateLegacyLocalUsers();

      const token = await getAuthToken();
      if (token) {
        try {
          const res = await apiRequest("GET", "/api/auth/me");
          const data = await res.json();
          const normalized = normalizeUser(data.user);
          setUser(normalized);
          await setLocalSessionUser(null);
          setIsGuest(false);
          return;
        } catch (error) {
          if (!isNetworkError(error)) {
            await setAuthToken(null);
          }
        }
      }

      const localSession = await getLocalSessionUser();
      if (localSession) {
        setUser(localSession);
        setIsGuest(false);
        return;
      }

      setUser(null);
      setIsGuest(false);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = await res.json();
      const normalized = normalizeUser(data.user);
      await setAuthToken(data.token);
      await setLocalSessionUser(null);
      setUser(normalized);
      setIsGuest(false);
      queryClient.clear();
      return { success: true };
    } catch (e: any) {
      if (isNetworkError(e)) {
        await migrateLegacyLocalUsers();
        const users = await getLocalUsers();
        const passwordHash = await hashPassword(password);
        const localUser = users.find(
          (u) => normalizeEmail(u.email) === normalizeEmail(email) && u.passwordHash === passwordHash
        );
        if (!localUser) {
          return { success: false, error: "Compte local introuvable. Reconnecte-toi." };
        }
        const authUser = toAuthUser(localUser);
        await setAuthToken(null);
        await setLocalSessionUser(authUser);
        setUser(authUser);
        setIsGuest(false);
        queryClient.clear();
        return { success: true };
      }
      const msg = e.message || "Login failed";
      return { success: false, error: msg };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const res = await apiRequest("POST", "/api/auth/register", {
        email,
        password,
        fullName: displayName,
      });
      const data = await res.json();
      const normalized = normalizeUser(data.user);
      await setAuthToken(data.token);
      await setLocalSessionUser(null);
      setUser(normalized);
      setIsGuest(false);
      queryClient.clear();
      return { success: true };
    } catch (e: any) {
      if (isNetworkError(e)) {
        await migrateLegacyLocalUsers();
        const users = await getLocalUsers();
        const exists = users.some((u) => normalizeEmail(u.email) === normalizeEmail(email));
        if (exists) {
          return { success: false, error: "Cet email existe deja en local. Connecte-toi." };
        }
        const localUser = await createLocalUser(email, password, displayName);
        await saveLocalUsers([...users, localUser]);
        const authUser = toAuthUser(localUser);
        await setAuthToken(null);
        await setLocalSessionUser(authUser);
        setUser(authUser);
        setIsGuest(false);
        queryClient.clear();
        return { success: true };
      }
      const msg = e.message || "Registration failed";
      return { success: false, error: msg };
    }
  }, []);

  const logout = useCallback(async () => {
    await setAuthToken(null);
    await setLocalSessionUser(null);
    setUser(null);
    setIsGuest(false);
    queryClient.clear();
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
  }, []);

  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    try {
      const res = await apiRequest("PATCH", "/api/users/profile", data);
      const result = await res.json();
      const normalized = normalizeUser(result.user);
      setUser(normalized);
      await setLocalSessionUser(null);
      return { success: true };
    } catch (e: any) {
      if (isNetworkError(e) && user?.id.startsWith("local_")) {
        await migrateLegacyLocalUsers();
        const users = await getLocalUsers();
        const idx = users.findIndex((u) => u.id === user.id);
        if (idx === -1) {
          return { success: false, error: "Compte local introuvable" };
        }
        const nextUser: LocalUserRecord = {
          ...users[idx],
          ...data,
          passwordHash: users[idx].passwordHash,
          isHashed: true,
        };
        users[idx] = nextUser;
        await saveLocalUsers(users);
        const authUser = toAuthUser(nextUser);
        setUser(authUser);
        await setLocalSessionUser(authUser);
        return { success: true };
      }
      return { success: false, error: e.message };
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user || isGuest,
        isGuest,
        login,
        register,
        logout,
        continueAsGuest,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
