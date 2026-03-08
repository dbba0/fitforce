import AsyncStorage from "@react-native-async-storage/async-storage";

export type CustomProgramMode = "home" | "gym" | "cardio";
export type CustomDifficulty = "beginner" | "intermediate" | "advanced";

export interface CustomExerciseItem {
  id: string;
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds: number;
  weightKg?: number;
}

export interface CustomProgramDay {
  id: string;
  label: string;
  focus: string;
  exercises: CustomExerciseItem[];
}

export interface CustomProgram {
  id: string;
  title: string;
  description: string;
  mode: CustomProgramMode;
  difficulty: CustomDifficulty;
  daysPerWeek: number;
  estimatedMinutes: number;
  days: CustomProgramDay[];
  createdAt: string;
  updatedAt: string;
}

const CUSTOM_PROGRAMS_KEY = "@fitforce_custom_programs";

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createId(prefix: string): string {
  return uid(prefix);
}

export function createEmptyProgram(mode: CustomProgramMode = "gym"): CustomProgram {
  return {
    id: uid("cp"),
    title: "Mon programme",
    description: "Programme personnalise",
    mode,
    difficulty: "intermediate",
    daysPerWeek: 3,
    estimatedMinutes: 50,
    days: [
      {
        id: uid("day"),
        label: "Jour 1",
        focus: mode === "cardio" ? "Cardio" : "Full Body",
        exercises: [],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function getCustomPrograms(): Promise<CustomProgram[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_PROGRAMS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCustomPrograms(programs: CustomProgram[]): Promise<void> {
  await AsyncStorage.setItem(CUSTOM_PROGRAMS_KEY, JSON.stringify(programs));
}

