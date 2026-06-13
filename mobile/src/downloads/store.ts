import {
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { bookDir, downloadsRoot, indexPath } from './paths';
import type { DownloadedBook } from './types';

/** Ensure the downloads root directory exists before reading/writing the index. */
export async function ensureRoot(): Promise<void> {
  const info = await getInfoAsync(downloadsRoot());
  if (!info.exists) {
    await makeDirectoryAsync(downloadsRoot(), { intermediates: true });
  }
}

export async function ensureBookDir(bookId: number): Promise<void> {
  await ensureRoot();
  const info = await getInfoAsync(bookDir(bookId));
  if (!info.exists) {
    await makeDirectoryAsync(bookDir(bookId), { intermediates: true });
  }
}

/** Read every downloaded book. Missing/corrupt index resolves to an empty list. */
export async function listDownloads(): Promise<DownloadedBook[]> {
  try {
    const info = await getInfoAsync(indexPath());
    if (!info.exists) return [];
    const raw = await readAsStringAsync(indexPath());
    const parsed = JSON.parse(raw) as DownloadedBook[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getDownload(bookId: number): Promise<DownloadedBook | null> {
  const all = await listDownloads();
  return all.find((d) => d.bookId === bookId) ?? null;
}

export async function isDownloaded(bookId: number): Promise<boolean> {
  return (await getDownload(bookId)) != null;
}

async function writeIndex(downloads: DownloadedBook[]): Promise<void> {
  await ensureRoot();
  await writeAsStringAsync(indexPath(), JSON.stringify(downloads));
}

/** Insert or replace a download record, keyed by bookId. */
export async function upsertDownload(entry: DownloadedBook): Promise<DownloadedBook[]> {
  const all = await listDownloads();
  const next = [...all.filter((d) => d.bookId !== entry.bookId), entry];
  await writeIndex(next);
  return next;
}

/** Remove a download's index entry and delete its on-disk files. */
export async function removeDownload(bookId: number): Promise<DownloadedBook[]> {
  const all = await listDownloads();
  const next = all.filter((d) => d.bookId !== bookId);
  await writeIndex(next);
  await deleteAsync(bookDir(bookId), { idempotent: true });
  return next;
}
