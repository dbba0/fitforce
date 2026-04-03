#!/usr/bin/env node
// @ts-nocheck

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const DEFAULT_LOCAL_EXERCISES_PATH = path.resolve(
  process.cwd(),
  "apps/mobile/data/exercises.ts"
);
const DEFAULT_OUTPUT_PATH = path.resolve(
  process.cwd(),
  "tmp/exercise-db-mapping.proposal.json"
);
const DEFAULT_CACHE_PATH = path.resolve(process.cwd(), "tmp/exercise-db.raw.json");
const DEFAULT_API_URL =
  process.env.EXERCISE_DB_LOCAL_API_URL ?? "http://localhost:4000/api/exercises";
const DEFAULT_MIN_SCORE = 0.58;

type LocalExercise = {
  id: string;
  name: string;
  existingExerciseDbId: string | null;
  existingImageUrl: string | null;
  existingVideoUrl: string | null;
};

type RemoteExercise = {
  id: string;
  name: string;
  target: string | null;
  bodyPart: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
};

const LOCAL_ALIASES: Record<string, string[]> = {
  pushup: ["push up", "press up"],
  bicep_curl: ["biceps curl", "dumbbell bicep curl"],
  tricep_extension: ["triceps extension", "dumbbell triceps extension"],
  lat_pulldown: ["lat pull down", "lat pull-down"],
  cable_row: ["seated cable row", "cable seated row"],
  incline_dumbbell_press: ["incline dumbbell bench press", "incline press"],
  romanian_deadlift: ["romanian deadlift", "rdl"],
  mountain_climber: ["mountain climber"],
  high_knees: ["high knees running"],
  jumping_jacks: ["jumping jack"],
  hip_thrust: ["barbell hip thrust"],
  calf_raise: ["standing calf raise", "calf raises"],
  dumbbell_row: ["one arm dumbbell row", "bent over dumbbell row"],
};

function getArgValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function printHelp() {
  console.log(`
Usage:
  npx tsc scripts/mapExerciseDbIds.ts --outDir tmp/scripts --module commonjs --target es2020 --esModuleInterop --skipLibCheck
  node tmp/scripts/mapExerciseDbIds.js [options]

Options:
  --api-url <url>          API locale qui retourne la liste ExerciseDB (défaut: ${DEFAULT_API_URL})
  --db-file <path>         Fichier JSON local ExerciseDB (si fourni, prioritaire sur --api-url)
  --output <path>          Fichier de sortie JSON (défaut: ${DEFAULT_OUTPUT_PATH})
  --cache-file <path>      Fichier cache JSON brut ExerciseDB (défaut: ${DEFAULT_CACHE_PATH})
  --min-score <0..1>       Seuil de match automatique (défaut: ${DEFAULT_MIN_SCORE})
  --help                   Affiche cette aide
`);
}

function ensureDirForFile(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function normalizeText(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return null;
  return raw;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function toTokenSet(value: string): Set<string> {
  return new Set(normalizeText(value).split(" ").filter(Boolean));
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = new Array(b.length + 1);
  const current = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) previous[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return current[b.length];
}

function getStringSimilarity(a: string, b: string): number {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const maxLen = Math.max(left.length, right.length);
  if (!maxLen) return 0;

  const distance = levenshteinDistance(left, right);
  return Math.max(0, 1 - distance / maxLen);
}

function getMatchScore(localQuery: string, remoteName: string): number {
  const left = normalizeText(localQuery);
  const right = normalizeText(remoteName);
  if (!left || !right) return 0;
  if (left === right) return 1;

  const leftTokens = toTokenSet(left);
  const rightTokens = toTokenSet(right);

  let intersection = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) intersection += 1;
  });

  const unionSize = new Set([...leftTokens, ...rightTokens]).size || 1;
  const overlapLeft = intersection / Math.max(1, leftTokens.size);
  const overlapRight = intersection / Math.max(1, rightTokens.size);
  const overlap = (overlapLeft + overlapRight) / 2;
  const jaccard = intersection / unionSize;
  const editSimilarity = getStringSimilarity(left, right);
  const substringBonus =
    left.includes(right) || right.includes(left) ? 0.12 : 0;

  const score = Math.min(
    0.995,
    0.48 * overlap + 0.27 * jaccard + 0.25 * editSimilarity + substringBonus
  );
  return Number(score.toFixed(4));
}

function getBestRemoteCandidate(localQueries: string[], remote: RemoteExercise[]) {
  const candidates = remote
    .map((item) => {
      let bestScore = 0;
      let bestQuery = "";
      localQueries.forEach((query) => {
        const score = getMatchScore(query, item.name);
        if (score > bestScore) {
          bestScore = score;
          bestQuery = query;
        }
      });
      return {
        remote: item,
        score: bestScore,
        matchedBy: bestQuery,
      };
    })
    .sort((a, b) => b.score - a.score);

  return candidates;
}

function extractFirstUrl(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = normalizeUrl(record[key]);
    if (value) return value;
  }
  return null;
}

function normalizeRemoteExercise(raw: any): RemoteExercise | null {
  const item = (raw ?? {}) as Record<string, unknown>;
  const id = String(item.id ?? item.exerciseId ?? "").trim();
  const name = String(item.name ?? item.exerciseName ?? item.title ?? "").trim();
  if (!id || !name) return null;

  const imageUrl =
    extractFirstUrl(item, ["imageUrl", "gifUrl", "gif", "image"]) ??
    `https://v2.exercisedb.io/image/${id}.gif`;
  let videoUrl =
    extractFirstUrl(item, [
      "videoUrl",
      "youtubeUrl",
      "youtubeURL",
      "video",
      "demoUrl",
      "tutorialUrl",
      "instructionVideoUrl",
    ]) ?? null;

  if (!videoUrl) {
    const youtubeId = String(item.youtubeId ?? item.youtube_id ?? "").trim();
    if (youtubeId) {
      videoUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    }
  }

  return {
    id,
    name,
    target: String(item.target ?? "").trim() || null,
    bodyPart: String(item.bodyPart ?? "").trim() || null,
    imageUrl,
    videoUrl,
  };
}

function loadRemoteFromJsonFile(filePath: string): RemoteExercise[] {
  const content = fs.readFileSync(filePath, "utf8");
  const payload = JSON.parse(content);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.exercises)
      ? payload.exercises
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  return list.map(normalizeRemoteExercise).filter(Boolean);
}

async function loadRemoteExercises(options: {
  dbFile?: string;
  apiUrl: string;
  cacheFile: string;
}): Promise<{ source: string; exercises: RemoteExercise[] }> {
  if (options.dbFile) {
    const resolved = path.resolve(process.cwd(), options.dbFile);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Fichier --db-file introuvable: ${resolved}`);
    }
    return {
      source: `file:${resolved}`,
      exercises: loadRemoteFromJsonFile(resolved),
    };
  }

  try {
    const response = await fetch(options.apiUrl);
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`HTTP ${response.status}: ${details.slice(0, 200)}`);
    }
    const payload = await response.json();
    ensureDirForFile(options.cacheFile);
    fs.writeFileSync(options.cacheFile, JSON.stringify(payload, null, 2), "utf8");

    const list = Array.isArray(payload?.exercises)
      ? payload.exercises
      : Array.isArray(payload)
        ? payload
        : [];

    return {
      source: `api:${options.apiUrl}`,
      exercises: list.map(normalizeRemoteExercise).filter(Boolean),
    };
  } catch (error) {
    if (fs.existsSync(options.cacheFile)) {
      return {
        source: `cache:${options.cacheFile}`,
        exercises: loadRemoteFromJsonFile(options.cacheFile),
      };
    }
    throw new Error(
      `Impossible de charger ExerciseDB depuis ${options.apiUrl}. Détail: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function loadLocalExercises(localFilePath: string): LocalExercise[] {
  const source = fs.readFileSync(localFilePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: localFilePath,
  }).outputText;

  const moduleRef = { exports: {} as Record<string, any> };
  const sandbox = {
    module: moduleRef,
    exports: moduleRef.exports,
    require,
    console,
    process,
    __dirname: path.dirname(localFilePath),
    __filename: localFilePath,
  };

  vm.runInNewContext(transpiled, sandbox, {
    filename: localFilePath,
    timeout: 5_000,
  });

  const rawExercises = moduleRef.exports?.EXERCISES;
  if (!Array.isArray(rawExercises)) {
    throw new Error(
      "Impossible de lire EXERCISES depuis apps/mobile/data/exercises.ts"
    );
  }

  return rawExercises
    .map((exercise: any) => {
      const id = String(exercise?.id ?? "").trim();
      if (!id) return null;
      const enName = String(exercise?.translations?.en?.name ?? "").trim();
      return {
        id,
        name: enName || id,
        existingExerciseDbId: String(exercise?.exerciseDbId ?? "").trim() || null,
        existingImageUrl:
          normalizeUrl(exercise?.imageUrl) ?? normalizeUrl(exercise?.gifUrl),
        existingVideoUrl: normalizeUrl(exercise?.videoUrl),
      } satisfies LocalExercise;
    })
    .filter(Boolean);
}

function buildLocalQueries(local: LocalExercise): string[] {
  const aliases = LOCAL_ALIASES[local.id] ?? [];
  return uniqueStrings([
    local.name,
    local.id,
    local.id.replace(/[_-]+/g, " "),
    ...aliases,
  ]);
}

function mapLocalToRemote(
  localExercises: LocalExercise[],
  remoteExercises: RemoteExercise[],
  minScore: number
) {
  const matched: any[] = [];
  const unmatched: any[] = [];

  localExercises.forEach((local) => {
    const queries = buildLocalQueries(local);
    const sortedCandidates = getBestRemoteCandidate(queries, remoteExercises);
    const top = sortedCandidates[0];

    const topSuggestions = sortedCandidates.slice(0, 3).map((candidate) => ({
      score: candidate.score,
      matchedBy: candidate.matchedBy,
      suggestedExerciseDbId: candidate.remote.id,
      suggestedImageUrl: candidate.remote.imageUrl,
      suggestedVideoUrl: candidate.remote.videoUrl,
      remoteName: candidate.remote.name,
      remoteTarget: candidate.remote.target,
      remoteBodyPart: candidate.remote.bodyPart,
    }));

    if (top && top.score >= minScore) {
      matched.push({
        localId: local.id,
        localName: local.name,
        existingExerciseDbId: local.existingExerciseDbId,
        existingImageUrl: local.existingImageUrl,
        existingVideoUrl: local.existingVideoUrl,
        score: top.score,
        matchedBy: top.matchedBy,
        suggestedExerciseDbId: top.remote.id,
        suggestedImageUrl: top.remote.imageUrl,
        suggestedVideoUrl: top.remote.videoUrl,
        remoteName: top.remote.name,
        remoteTarget: top.remote.target,
        remoteBodyPart: top.remote.bodyPart,
        alreadyMapped: local.existingExerciseDbId === top.remote.id,
        alternatives: topSuggestions.slice(1),
      });
      return;
    }

    unmatched.push({
      localId: local.id,
      localName: local.name,
      existingExerciseDbId: local.existingExerciseDbId,
      existingImageUrl: local.existingImageUrl,
      existingVideoUrl: local.existingVideoUrl,
      suggestions: topSuggestions,
    });
  });

  return { matched, unmatched };
}

async function main() {
  if (hasFlag("--help")) {
    printHelp();
    return;
  }

  const localFilePath = path.resolve(
    process.cwd(),
    getArgValue("--local-file") ?? DEFAULT_LOCAL_EXERCISES_PATH
  );
  const dbFileArg = getArgValue("--db-file");
  const apiUrl = getArgValue("--api-url") ?? DEFAULT_API_URL;
  const outputPath = path.resolve(
    process.cwd(),
    getArgValue("--output") ?? DEFAULT_OUTPUT_PATH
  );
  const cachePath = path.resolve(
    process.cwd(),
    getArgValue("--cache-file") ?? DEFAULT_CACHE_PATH
  );
  const minScoreValue = Number(getArgValue("--min-score") ?? DEFAULT_MIN_SCORE);
  const minScore = Number.isFinite(minScoreValue)
    ? Math.max(0, Math.min(1, minScoreValue))
    : DEFAULT_MIN_SCORE;

  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Fichier local introuvable: ${localFilePath}`);
  }

  const localExercises = loadLocalExercises(localFilePath);
  const { source, exercises: remoteExercises } = await loadRemoteExercises({
    dbFile: dbFileArg,
    apiUrl,
    cacheFile: cachePath,
  });

  if (!remoteExercises.length) {
    throw new Error(
      "Aucun exercice distant trouvé. Vérifie l'API locale ou fournis --db-file."
    );
  }

  const { matched, unmatched } = mapLocalToRemote(
    localExercises,
    remoteExercises,
    minScore
  );

  const report = {
    generatedAt: new Date().toISOString(),
    config: {
      localFilePath,
      source,
      outputPath,
      minScore,
    },
    stats: {
      localExercises: localExercises.length,
      remoteExercises: remoteExercises.length,
      matched: matched.length,
      unmatched: unmatched.length,
      coverage: Number(((matched.length / Math.max(1, localExercises.length)) * 100).toFixed(2)),
    },
    matched,
    unmatched,
  };

  ensureDirForFile(outputPath);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf8");

  console.log("[mapExerciseDbIds] Mapping terminé");
  console.log(`- Source distante : ${source}`);
  console.log(`- Exercices locaux : ${report.stats.localExercises}`);
  console.log(`- Exercices distants : ${report.stats.remoteExercises}`);
  console.log(`- Matched : ${report.stats.matched}`);
  console.log(`- Unmatched : ${report.stats.unmatched}`);
  console.log(`- Couverture : ${report.stats.coverage}%`);
  console.log(`- Rapport JSON : ${outputPath}`);

  if (unmatched.length) {
    console.log("\n[mapExerciseDbIds] Exercices sans match solide (top suggestion):");
    unmatched.slice(0, 20).forEach((item) => {
      const top = item.suggestions?.[0];
      if (!top) {
        console.log(`  - ${item.localId} (${item.localName}) -> aucune suggestion`);
        return;
      }
      console.log(
        `  - ${item.localId} (${item.localName}) -> ${top.remoteName} [${top.suggestedExerciseDbId}] score=${top.score}`
      );
    });
    if (unmatched.length > 20) {
      console.log(`  ... (${unmatched.length - 20} autres, voir JSON)`);
    }
  }
}

main().catch((error) => {
  console.error("[mapExerciseDbIds] Erreur:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
