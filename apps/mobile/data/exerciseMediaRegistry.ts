import type { ComponentType } from "react";
import type { MuscleGroup } from "@/data/exercises";

export type ExerciseMediaDefinition = {
  lottieAsset?: number;
  remoteVideoUrl?: string;
  anatomicalSvg?: ComponentType<any>;
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
};

const LOTTIE_UPPER = require("../assets/animations/exercises/silhouette_upper.json");
const LOTTIE_LOWER = require("../assets/animations/exercises/silhouette_lower.json");
const LOTTIE_CORE = require("../assets/animations/exercises/silhouette_core.json");

export const EXERCISE_MEDIA_REGISTRY: Record<string, ExerciseMediaDefinition> = {
  bench_press: {
    lottieAsset: LOTTIE_UPPER,
    primaryMuscles: ["chest"],
    secondaryMuscles: ["arms", "shoulders"],
  },
  squat: {
    lottieAsset: LOTTIE_LOWER,
    primaryMuscles: ["legs"],
    secondaryMuscles: ["core"],
  },
  deadlift: {
    lottieAsset: LOTTIE_LOWER,
    primaryMuscles: ["back", "legs"],
    secondaryMuscles: ["core", "arms"],
  },
  pushup: {
    lottieAsset: LOTTIE_UPPER,
    primaryMuscles: ["chest"],
    secondaryMuscles: ["arms", "shoulders", "core"],
  },
  pullup: {
    lottieAsset: LOTTIE_UPPER,
    primaryMuscles: ["back"],
    secondaryMuscles: ["arms", "shoulders", "core"],
  },
  shoulder_press: {
    lottieAsset: LOTTIE_UPPER,
    primaryMuscles: ["shoulders"],
    secondaryMuscles: ["arms", "core"],
  },
  bicep_curl: {
    lottieAsset: LOTTIE_UPPER,
    primaryMuscles: ["arms"],
    secondaryMuscles: ["shoulders"],
  },
  tricep_extension: {
    lottieAsset: LOTTIE_UPPER,
    primaryMuscles: ["arms"],
    secondaryMuscles: ["shoulders", "core"],
  },
  plank: {
    lottieAsset: LOTTIE_CORE,
    primaryMuscles: ["core"],
    secondaryMuscles: ["shoulders"],
  },
  lunge: {
    lottieAsset: LOTTIE_LOWER,
    primaryMuscles: ["legs"],
    secondaryMuscles: ["core"],
  },

  // Alias prévu pour futurs IDs/normalisations
  lunges: {
    lottieAsset: LOTTIE_LOWER,
    primaryMuscles: ["legs"],
    secondaryMuscles: ["core"],
  },
  tricep_dip: {
    lottieAsset: LOTTIE_UPPER,
    primaryMuscles: ["arms"],
    secondaryMuscles: ["chest", "shoulders", "core"],
  },
};
