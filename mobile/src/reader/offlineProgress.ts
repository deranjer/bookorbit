import {
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { getFileProgress, saveFileProgress } from '@/src/api/reader';

/**
 * Offline-first reading-position queue, keyed by server file id. Mirrors the audiobook
 * player's offlineProgress.ts: every position is written locally first (so it survives
 * offline + app restart) and marked dirty until the server accepts it.
 */
function progressPath(): string {
  return `${documentDirectory}reader-progress.json`;
}

export interface LocalReaderProgress {
  cfi: string | null;
  percentage: number;
  /** ms epoch of the last local write — used to break ties against the server. */
  updatedAt: number;
  /** true when this position has not yet been accepted by the server. */
  dirty: boolean;
}

type ProgressMap = Record<number, LocalReaderProgress>;

async function readMap(): Promise<ProgressMap> {
  try {
    const info = await getInfoAsync(progressPath());
    if (!info.exists) return {};
    const parsed = JSON.parse(await readAsStringAsync(progressPath())) as ProgressMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeMap(map: ProgressMap): Promise<void> {
  await writeAsStringAsync(progressPath(), JSON.stringify(map));
}

export async function saveLocalProgress(
  fileId: number,
  progress: { cfi: string | null; percentage: number },
): Promise<void> {
  const map = await readMap();
  map[fileId] = { ...progress, updatedAt: Date.now(), dirty: true };
  await writeMap(map);
}

export async function getLocalProgress(fileId: number): Promise<LocalReaderProgress | null> {
  const map = await readMap();
  return map[fileId] ?? null;
}

export async function markSynced(fileId: number): Promise<void> {
  const map = await readMap();
  const entry = map[fileId];
  if (!entry || !entry.dirty) return;
  map[fileId] = { ...entry, dirty: false };
  await writeMap(map);
}

/**
 * Push every pending (dirty) position to the server. Entries that fail (still offline)
 * stay dirty for the next attempt. Returns the number successfully synced.
 */
export async function flushPendingProgress(): Promise<number> {
  const map = await readMap();
  const pending = Object.entries(map).filter(([, p]) => p.dirty);
  if (pending.length === 0) return 0;

  let synced = 0;
  for (const [fileIdStr, p] of pending) {
    const fileId = Number(fileIdStr);
    try {
      await saveFileProgress(fileId, { cfi: p.cfi, percentage: p.percentage });
      map[fileId] = { ...p, dirty: false };
      synced += 1;
    } catch {
      // Leave dirty; a later flush (reconnect / foreground) retries.
    }
  }
  if (synced > 0) await writeMap(map);
  return synced;
}

export interface InitialProgress {
  cfi: string | null;
  /** Normalized 0..1 position for foliate's goToFraction fallback. */
  fraction: number | null;
}

/**
 * Resolve where to resume a file: a not-yet-synced local position wins (it's the most
 * recent reading), otherwise the server's, otherwise the start.
 */
export async function resolveInitialProgress(fileId: number): Promise<InitialProgress> {
  const local = await getLocalProgress(fileId);
  let server = null;
  try {
    server = await getFileProgress(fileId);
  } catch {
    server = null;
  }

  const chosen = local && (local.dirty || !server) ? local : server;
  if (!chosen) return { cfi: null, fraction: null };
  const pct = typeof chosen.percentage === 'number' ? chosen.percentage : null;
  return { cfi: chosen.cfi ?? null, fraction: pct != null ? pct / 100 : null };
}
