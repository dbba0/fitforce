export type GoalProgress = {
  sessions: { done: number; target: number; percent: number };
  calories: { done: number; target: number; percent: number };
};

export type DashboardSummary = {
  totalSessions: number;
  totalMinutes: number;
  totalCalories: number;
  bestPerformance: number;
  weekOverWeekCaloriesDelta: number;
};

export type Program = {
  _id: string;
  title: string;
  description: string;
  mode: 'home' | 'gym';
  level: string;
  daysPerWeek: number;
  tags: string[];
  sessions?: {
    dayLabel: string;
    focus: string;
    exercises: {
      exercise?: {
        _id: string;
        name: string;
        equipment?: string;
      };
      sets?: number;
      reps?: string;
      restSec?: number;
      targetLoadKg?: number;
    }[];
  }[];
};

export type LocalProgramExercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  restSec: number;
  loadKg?: number;
};

export type LocalProgramDay = {
  id: string;
  label: string;
  focus: string;
  exercises: LocalProgramExercise[];
};

export type LocalProgram = {
  id: string;
  title: string;
  description: string;
  mode: 'home' | 'gym';
  daysPerWeek: number;
  days: LocalProgramDay[];
  createdAt: string;
};
