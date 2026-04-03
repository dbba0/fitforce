export interface ExerciseDbItem {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl: string;
  secondaryMuscles: string[];
  instructions: string[];
}

const EXERCISEDB_BASE =
  process.env.EXPO_PUBLIC_EXERCISEDB_URL ?? "https://exercisedb.dev";
const EXERCISEDB_BASE_NORMALIZED = EXERCISEDB_BASE.replace(/\/+$/, "");
const EXERCISE_DB_BASE_URL = `${EXERCISEDB_BASE_NORMALIZED}/api/v2`;
const EXERCISE_DB_TIMEOUT_MS = 8000;

function toStringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function normalizeExerciseDbItem(payload: unknown): ExerciseDbItem | null {
  const item = payload as Record<string, unknown> | null | undefined;
  const id = toStringValue(item?.id);
  const name = toStringValue(item?.name);

  if (!id || !name) return null;

  return {
    id,
    name,
    bodyPart: toStringValue(item?.bodyPart),
    target: toStringValue(item?.target),
    equipment: toStringValue(item?.equipment),
    gifUrl: toStringValue(item?.gifUrl),
    secondaryMuscles: toStringArray(item?.secondaryMuscles),
    instructions: toStringArray(item?.instructions),
  };
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXERCISE_DB_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchExerciseById(
  exerciseDbId: string
): Promise<ExerciseDbItem | null> {
  const id = exerciseDbId.trim();
  if (!id) return null;

  const url = `${EXERCISE_DB_BASE_URL}/exercises/exercise/${encodeURIComponent(id)}`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      console.warn(
        `[ExerciseDbService] fetchExerciseById failed with status ${response.status} for id=${id}`
      );
      return null;
    }

    const payload = await response.json();
    const candidate =
      payload && typeof payload === "object" && "exercise" in payload
        ? (payload as { exercise?: unknown }).exercise
        : payload;

    return normalizeExerciseDbItem(candidate);
  } catch (error) {
    console.warn("[ExerciseDbService] fetchExerciseById error:", error);
    return null;
  }
}

export async function fetchExercisesByBodyPart(
  bodyPart: string
): Promise<ExerciseDbItem[]> {
  const normalizedBodyPart = bodyPart.trim();
  if (!normalizedBodyPart) return [];

  const url = `${EXERCISE_DB_BASE_URL}/exercises/bodyPart/${encodeURIComponent(
    normalizedBodyPart
  )}?limit=20`;

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      console.warn(
        `[ExerciseDbService] fetchExercisesByBodyPart failed with status ${response.status} for bodyPart=${normalizedBodyPart}`
      );
      return [];
    }

    const payload = await response.json();
    const list =
      payload && typeof payload === "object" && "exercises" in payload
        ? (payload as { exercises?: unknown }).exercises
        : payload;

    if (!Array.isArray(list)) return [];

    return list
      .map((item) => normalizeExerciseDbItem(item))
      .filter((item): item is ExerciseDbItem => item !== null);
  } catch (error) {
    console.warn("[ExerciseDbService] fetchExercisesByBodyPart error:", error);
    return [];
  }
}

export function getExerciseGifUrl(exerciseDbId: string): string {
  return `${EXERCISEDB_BASE_NORMALIZED}/image/${exerciseDbId}.gif`;
}
