import { DEFAULT_MODEL, GEMINI_MODELS, MAX_HISTORY, STORAGE_KEYS } from '../constants';
import type { Reading } from '../types/reading';
import type { SajuResult } from '../types/saju';

/** 스토리지 접근이 막힌 환경(사생활 보호 모드 등)에서도 앱이 죽지 않도록 모두 try/catch로 감싼다. */
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export interface StoredKey {
  key: string;
  persistent: boolean;
}

export function loadApiKey(): StoredKey | null {
  const local = safe(() => localStorage.getItem(STORAGE_KEYS.apiKey), null);
  if (local) return { key: local, persistent: true };
  const session = safe(() => sessionStorage.getItem(STORAGE_KEYS.apiKey), null);
  return session ? { key: session, persistent: false } : null;
}

/** persistent=true → localStorage, false → sessionStorage. 다른 쪽에는 남기지 않는다. */
export function saveApiKey(key: string, persistent: boolean): void {
  clearApiKey();
  safe(
    () => (persistent ? localStorage : sessionStorage).setItem(STORAGE_KEYS.apiKey, key),
    undefined,
  );
}

export function clearApiKey(): void {
  safe(() => localStorage.removeItem(STORAGE_KEYS.apiKey), undefined);
  safe(() => sessionStorage.removeItem(STORAGE_KEYS.apiKey), undefined);
}

export function loadModel(): string {
  const m = safe(() => localStorage.getItem(STORAGE_KEYS.model), null);
  return m && GEMINI_MODELS.some((x) => x.id === m) ? m : DEFAULT_MODEL;
}

export function saveModel(model: string): void {
  safe(() => localStorage.setItem(STORAGE_KEYS.model, model), undefined);
}

export function saveTheme(dark: boolean): void {
  safe(() => localStorage.setItem(STORAGE_KEYS.theme, dark ? 'dark' : 'light'), undefined);
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  model: string;
  saju: SajuResult;
  reading: Reading;
}

export function loadHistory(): HistoryEntry[] {
  return safe(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  }, []);
}

function writeHistory(list: HistoryEntry[]): void {
  safe(() => localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(list)), undefined);
}

export function addHistory(entry: HistoryEntry): HistoryEntry[] {
  const list = [entry, ...loadHistory().filter((e) => e.id !== entry.id)].slice(0, MAX_HISTORY);
  writeHistory(list);
  return list;
}

export function removeHistory(id: string): HistoryEntry[] {
  const list = loadHistory().filter((e) => e.id !== id);
  writeHistory(list);
  return list;
}

export function clearHistory(): void {
  writeHistory([]);
}
