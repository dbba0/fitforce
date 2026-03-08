import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalProgram } from '@/types';

const STORAGE_KEY = 'fitpulse_local_programs_v1';

export async function getLocalPrograms() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [] as LocalProgram[];
  try {
    return JSON.parse(raw) as LocalProgram[];
  } catch {
    return [] as LocalProgram[];
  }
}

export async function saveLocalPrograms(programs: LocalProgram[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
}

export async function addLocalProgram(program: LocalProgram) {
  const all = await getLocalPrograms();
  const updated = [program, ...all];
  await saveLocalPrograms(updated);
  return updated;
}

export async function deleteLocalProgram(id: string) {
  const all = await getLocalPrograms();
  const updated = all.filter((p) => p.id !== id);
  await saveLocalPrograms(updated);
  return updated;
}
