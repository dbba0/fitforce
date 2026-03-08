import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@/api/client';
import { AUTH_BYPASS_ENABLED } from '@/constants/flags';

type User = {
  _id: string;
  email: string;
  fullName: string;
  goalType: string;
  level: string;
  isPremium: boolean;
  streakDays: number;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: {
    email: string;
    password: string;
    fullName: string;
    age?: number;
    weightKg?: number;
    heightCm?: number;
    level?: string;
    goalType?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (AUTH_BYPASS_ENABLED) {
      setUser({
        _id: 'demo-user',
        email: 'demo@fitpulse.app',
        fullName: 'Demo User',
        goalType: 'recomposition',
        level: 'debutant',
        isPremium: true,
        streakDays: 5
      });
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const token = await AsyncStorage.getItem('fitpulse_token');
        if (!token) return;
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch {
        await AsyncStorage.removeItem('fitpulse_token');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const signIn = async (email: string, password: string) => {
    if (AUTH_BYPASS_ENABLED) return;
    const response = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('fitpulse_token', response.data.token);
    setUser(response.data.user);
  };

  const signUp = async (payload: {
    email: string;
    password: string;
    fullName: string;
    age?: number;
    weightKg?: number;
    heightCm?: number;
    level?: string;
    goalType?: string;
  }) => {
    if (AUTH_BYPASS_ENABLED) return;
    const response = await api.post('/auth/register', payload);
    await AsyncStorage.setItem('fitpulse_token', response.data.token);
    setUser(response.data.user);
  };

  const signOut = async () => {
    if (AUTH_BYPASS_ENABLED) return;
    await AsyncStorage.removeItem('fitpulse_token');
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
