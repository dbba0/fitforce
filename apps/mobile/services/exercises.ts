import { apiRequest } from "@/lib/query-client";

export interface RemoteExercise {
  id: string;
  name: string;
  target: string;
  bodyPart: string;
  gifUrl: string;
}

function normalizeRemoteExercise(item: any): RemoteExercise | null {
  const id = String(item?.id ?? "").trim();
  const name = String(item?.name ?? "").trim();
  if (!id || !name) return null;

  return {
    id,
    name,
    target: String(item?.target ?? "").trim(),
    bodyPart: String(item?.bodyPart ?? "").trim(),
    gifUrl: String(item?.gifUrl ?? "").trim(),
  };
}

export async function fetchExercisesFromApi(): Promise<RemoteExercise[]> {
  try {
    const response = await apiRequest("GET", "/api/exercises");
    const payload = await response.json();
    const list = Array.isArray(payload?.exercises) ? payload.exercises : [];
    return list.map(normalizeRemoteExercise).filter(Boolean) as RemoteExercise[];
  } catch (error) {
    console.error("[ExercisesService] Failed to fetch exercises from API", error);
    return [];
  }
}
