import {
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import type { AudioProgress } from '@/src/api/types';
import { saveAudioProgress } from '@/src/api/books';
import { downloadsRoot } from '@/src/downloads/paths';
import { ensureRoot } from '@/src/downloads/store';

function progressPath(): string {
  return `${downloadsRoot()}progress.json`;
}

export interface LocalProgress extends AudioProgress {
  /** ms epoch of the last local write — used to break ties against the server. */
  updatedAt: number;
  /** true when this position has not yet been accepted by the server. */
  dirty: boolean;
}

type ProgressMap = Record<number, LocalProgress>;

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
  await ensureRoot();
  await writeAsStringAsync(progressPath(), JSON.stringify(map));
}

/** Persist the latest position locally and mark it pending server sync. */
export async function saveLocalProgress(bookId: number, progress: AudioProgress): Promise<void> {
  const map = await readMap();
  map[bookId] = { ...progress, updatedAt: Date.now(), dirty: true };
  await writeMap(map);
}

export async function getLocalProgress(bookId: number): Promise<LocalProgress | null> {
  const map = await readMap();
  return map[bookId] ?? null;
}

/** Clear the dirty flag once the server has the position. */
export async function markSynced(bookId: number): Promise<void> {
  const map = await readMap();
  const entry = map[bookId];
  if (!entry || !entry.dirty) return;
  map[bookId] = { ...entry, dirty: false };
  await writeMap(map);
}

/**
 * Push every pending (dirty) position to the server. Entries that fail (e.g. still
 * offline) stay dirty for the next attempt. Returns the number successfully synced.
 */
export async function flushPendingProgress(): Promise<number> {
  const map = await readMap();
  const pending = Object.entries(map).filter(([, p]) => p.dirty);
  if (pending.length === 0) return 0;

  let synced = 0;
  for (const [bookIdStr, p] of pending) {
    const bookId = Number(bookIdStr);
    try {
      await saveAudioProgress(bookId, {
        currentFileId: p.currentFileId,
        positionSeconds: p.positionSeconds,
        percentage: p.percentage,
      });
      map[bookId] = { ...p, dirty: false };
      synced += 1;
    } catch {
      // Leave dirty; a later flush (reconnect / foreground) retries.
    }
  }
  if (synced > 0) await writeMap(map);
  return synced;
}
