import AsyncStorage from "@react-native-async-storage/async-storage";

const EXERCISE_HISTORY_KEY = "@fitforce_exercise_history_map";

export interface ExerciseLastPerformance {
  sets: number;
  reps: number;
  weightKg: number;
  updatedAt: string;
}

type ExerciseHistoryMap = Record<string, ExerciseLastPerformance>;

export async function getExerciseHistoryMap(): Promise<ExerciseHistoryMap> {
  try {
    const raw = await AsyncStorage.getItem(EXERCISE_HISTORY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ExerciseHistoryMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveExercisePerformance(
  exerciseId: string,
  performance: ExerciseLastPerformance
): Promise<void> {
  if (!exerciseId) return;
  try {
    const map = await getExerciseHistoryMap();
    map[exerciseId] = performance;
    await AsyncStorage.setItem(EXERCISE_HISTORY_KEY, JSON.stringify(map));
  } catch {
  }
}
