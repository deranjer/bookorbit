import {
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import type { BookDetail } from '@/src/api/types';
import { downloadsRoot } from './paths';
import { ensureRoot } from './store';

/**
 * A download that has started but not yet finalised into the index. Persisted so an
 * interrupted or process-killed download can be resumed on the next app launch.
 * Carries everything needed both to finish the transfer (urls/dests/sizes) and to
 * write the final DownloadedBook record (format/filename/duration + the BookDetail).
 */
export interface PendingFile {
  fileId: number;
  url: string;
  dest: string;
  sizeBytes: number;
  format: string | null;
  filename: string | null;
  durationSeconds: number | null;
}

export interface PendingDownload {
  bookId: number;
  book: BookDetail;
  files: PendingFile[];
  coverUrl: string | null;
  coverDest: string | null;
  startedAt: string;
}

function journalPath(): string {
  return `${downloadsRoot()}pending.json`;
}

export async function readPending(): Promise<PendingDownload[]> {
  try {
    const info = await getInfoAsync(journalPath());
    if (!info.exists) return [];
    const parsed = JSON.parse(await readAsStringAsync(journalPath())) as PendingDownload[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePending(list: PendingDownload[]): Promise<void> {
  await ensureRoot();
  await writeAsStringAsync(journalPath(), JSON.stringify(list));
}

/** Add or replace a pending entry, keyed by bookId. */
export async function addPending(entry: PendingDownload): Promise<void> {
  const all = await readPending();
  await writePending([...all.filter((p) => p.bookId !== entry.bookId), entry]);
}

export async function removePending(bookId: number): Promise<void> {
  const all = await readPending();
  await writePending(all.filter((p) => p.bookId !== bookId));
}
