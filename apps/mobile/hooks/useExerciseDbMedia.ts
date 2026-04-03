import { useQuery } from "@tanstack/react-query";
import { fetchExerciseById, getExerciseGifUrl } from "@/services/exerciseDb";

type UseExerciseDbMediaResult = {
  gifUrl: string | null;
  instructions: string[];
  secondaryMuscles: string[];
  isLoading: boolean;
  isError: boolean;
};

const EXERCISE_DB_STALE_TIME_MS = 1000 * 60 * 30;

export function useExerciseDbMedia(
  exerciseDbId?: string | null
): UseExerciseDbMediaResult {
  const normalizedId = exerciseDbId?.trim() ?? "";
  const hasExerciseDbId = normalizedId.length > 0;
  const gifUrl = hasExerciseDbId ? getExerciseGifUrl(normalizedId) : null;

  const query = useQuery({
    queryKey: ["exerciseDb", normalizedId],
    queryFn: () => fetchExerciseById(normalizedId),
    staleTime: EXERCISE_DB_STALE_TIME_MS,
    enabled: hasExerciseDbId,
  });

  if (!hasExerciseDbId) {
    return {
      gifUrl: null,
      instructions: [],
      secondaryMuscles: [],
      isLoading: false,
      isError: false,
    };
  }

  if (query.isLoading || query.isError) {
    return {
      gifUrl,
      instructions: [],
      secondaryMuscles: [],
      isLoading: query.isLoading,
      isError: query.isError,
    };
  }

  return {
    gifUrl,
    instructions: query.data?.instructions ?? [],
    secondaryMuscles: query.data?.secondaryMuscles ?? [],
    isLoading: false,
    isError: false,
  };
}
