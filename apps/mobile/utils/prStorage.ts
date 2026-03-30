import AsyncStorage from "@react-native-async-storage/async-storage";

const PR_STORAGE_KEY = "@fitforce_pr_records";
const PR_TIMELINE_KEY = "@fitforce_pr_timeline";
const PR_TIMELINE_LIMIT = 24;

type PrMap = Record<string, { score: number; updatedAt: string }>;

export interface RecentPrRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  score: number;
  weightKg: number;
  reps: number;
  date: string;
}

async function readPrMap(): Promise<PrMap> {
  try {
    const raw = await AsyncStorage.getItem(PR_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PrMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writePrMap(map: PrMap): Promise<void> {
  try {
    await AsyncStorage.setItem(PR_STORAGE_KEY, JSON.stringify(map));
  } catch {
  }
}

function sanitizeRecord(raw: unknown): RecentPrRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Partial<RecentPrRecord>;
  if (!item.exerciseId || !item.exerciseName || !item.date) return null;
  const numericScore = Number(item.score ?? 0);
  if (!Number.isFinite(numericScore) || numericScore <= 0) return null;

  return {
    id: String(item.id ?? `${item.exerciseId}-${item.date}`),
    exerciseId: String(item.exerciseId),
    exerciseName: String(item.exerciseName),
    score: numericScore,
    weightKg: Math.max(0, Number(item.weightKg ?? 0)),
    reps: Math.max(0, Number(item.reps ?? 0)),
    date: String(item.date),
  };
}

async function readTimeline(): Promise<RecentPrRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(PR_TIMELINE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => sanitizeRecord(entry))
      .filter((entry): entry is RecentPrRecord => entry !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

async function writeTimeline(records: RecentPrRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PR_TIMELINE_KEY, JSON.stringify(records.slice(0, PR_TIMELINE_LIMIT)));
  } catch {
  }
}

export async function getRecentPrTimeline(limit = 6): Promise<RecentPrRecord[]> {
  const records = await readTimeline();
  const safeLimit = Math.max(0, Math.floor(limit));
  return records.slice(0, safeLimit);
}

export async function checkAndStorePr(
  exerciseId: string,
  score: number,
  meta?: {
    exerciseName?: string;
    weightKg?: number;
    reps?: number;
    date?: string;
  }
): Promise<{
  isNewPr: boolean;
  bestScore: number;
  previousBest: number;
}> {
  if (!exerciseId || score <= 0 || !Number.isFinite(score)) {
    return { isNewPr: false, bestScore: 0, previousBest: 0 };
  }

  const map = await readPrMap();
  const previousBest = map[exerciseId]?.score ?? 0;
  if (score <= previousBest) {
    return { isNewPr: false, bestScore: previousBest, previousBest };
  }

  map[exerciseId] = {
    score,
    updatedAt: new Date().toISOString(),
  };
  const timelineDate = meta?.date ?? new Date().toISOString();
  const timelineName = meta?.exerciseName?.trim() || exerciseId;
  const timelineRecord: RecentPrRecord = {
    id: `${exerciseId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    exerciseId,
    exerciseName: timelineName,
    score,
    weightKg: Math.max(0, Number(meta?.weightKg ?? 0)),
    reps: Math.max(0, Number(meta?.reps ?? 0)),
    date: timelineDate,
  };

  const [timeline] = await Promise.all([readTimeline(), writePrMap(map)]);
  const nextTimeline = [
    timelineRecord,
    ...timeline.filter((item) => !(item.exerciseId === exerciseId && item.score === score && item.date === timelineDate)),
  ].slice(0, PR_TIMELINE_LIMIT);
  await writeTimeline(nextTimeline);

  return { isNewPr: true, bestScore: score, previousBest };
}
