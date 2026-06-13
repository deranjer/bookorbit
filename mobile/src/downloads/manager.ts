import {
  createDownloadResumable,
  deleteAsync,
  FileSystemSessionType,
  getInfoAsync,
} from 'expo-file-system/legacy';
import type { BookDetail } from '@/src/api/types';
import { tokenStore } from '@/src/auth/tokenStore';
import { serverUrlStore } from '@/src/auth/serverUrlStore';
import { isAudiobook } from '@/src/playback/queue';
import { addPending, readPending, removePending, type PendingDownload, type PendingFile } from './journal';
import { coverPath, localFilePath } from './paths';
import { downloadableFiles, primaryFormat } from './select';
import { ensureBookDir, removeDownload, upsertDownload } from './store';
import type { DownloadedBook, DownloadedFile } from './types';

function authHeaders(): Record<string, string> {
  const token = tokenStore.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function serveUrl(fileId: number): string {
  const base = serverUrlStore.get() ?? '';
  return `${base}/api/v1/books/files/${fileId}/serve`;
}

function coverUrl(bookId: number): string {
  const base = serverUrlStore.get() ?? '';
  return `${base}/api/v1/books/${bookId}/cover`;
}

export type ProgressFn = (fraction: number) => void;

// Explicit background session: on iOS this keeps the transfer alive while the app is
// suspended; on Android downloads are always backgrounded. Progress callbacks don't
// fire while backgrounded — they catch up when the app returns to the foreground.
const SESSION = { sessionType: FileSystemSessionType.BACKGROUND };

/** A downloaded file is "complete" when it exists and matches its expected size. */
async function isComplete(file: PendingFile): Promise<boolean> {
  const info = await getInfoAsync(file.dest);
  if (!info.exists) return false;
  // When the server didn't report a size we can't verify; treat presence as complete.
  return file.sizeBytes > 0 ? info.size === file.sizeBytes : true;
}

/**
 * Run (or resume) a journaled download: fetch any incomplete files plus the cover,
 * write the final DownloadedBook record, and clear the journal entry. Files already
 * fully on disk (e.g. completed before an app kill) are skipped.
 */
async function runDownload(pending: PendingDownload, onProgress?: ProgressFn): Promise<DownloadedBook> {
  const { book, files } = pending;
  await ensureBookDir(book.id);

  const totalBytes = files.reduce((a, f) => a + f.sizeBytes, 0);
  const headers = authHeaders();
  const downloaded: DownloadedFile[] = [];

  // Seed progress with whatever is already on disk so a resumed bar starts mid-way.
  let completedBytes = 0;
  for (const f of files) {
    if (await isComplete(f)) completedBytes += f.sizeBytes;
  }

  for (let i = 0; i < files.length; i++) {
    const f = files[i]!;
    const toDownloadedFile = (uri: string): DownloadedFile => ({
      id: f.fileId,
      localUri: uri,
      filename: f.filename,
      format: f.format,
      durationSeconds: f.durationSeconds,
    });

    if (await isComplete(f)) {
      downloaded.push(toDownloadedFile(f.dest));
      continue;
    }

    // Drop any partial bytes: createDownloadResumable has no kill-surviving resume
    // data, so restart the interrupted file cleanly rather than appending.
    await deleteAsync(f.dest, { idempotent: true });

    const task = createDownloadResumable(f.url, f.dest, { headers, ...SESSION }, (p) => {
      if (!onProgress) return;
      const fileFraction =
        p.totalBytesExpectedToWrite > 0 ? p.totalBytesWritten / p.totalBytesExpectedToWrite : 0;
      const overall =
        totalBytes > 0 ? (completedBytes + f.sizeBytes * fileFraction) / totalBytes : (i + fileFraction) / files.length;
      onProgress(Math.min(1, overall));
    });

    const result = await task.downloadAsync();
    if (!result) throw new Error('Download was interrupted.');
    completedBytes += f.sizeBytes;
    onProgress?.(totalBytes > 0 ? Math.min(1, completedBytes / totalBytes) : (i + 1) / files.length);
    downloaded.push(toDownloadedFile(result.uri));
  }

  // Cover is best-effort: a missing/failed cover should not fail the download.
  let coverLocalUri: string | null = null;
  if (pending.coverUrl && pending.coverDest) {
    try {
      const coverTask = createDownloadResumable(pending.coverUrl, pending.coverDest, { headers, ...SESSION });
      const coverResult = await coverTask.downloadAsync();
      coverLocalUri = coverResult?.uri ?? null;
    } catch {
      coverLocalUri = null;
    }
  }

  const entry: DownloadedBook = {
    bookId: book.id,
    title: book.title,
    authors: book.authors.map((a) => a.name),
    narrators: book.audioMetadata?.narrators.map((n) => n.name) ?? [],
    isAudiobook: isAudiobook(book),
    format: primaryFormat(book),
    sizeBytes: await actualSize(downloaded, totalBytes),
    downloadedAt: new Date().toISOString(),
    coverLocalUri,
    files: downloaded,
    book,
  };

  await upsertDownload(entry);
  await removePending(book.id);
  return entry;
}

function buildPending(book: BookDetail): PendingDownload {
  const files = downloadableFiles(book);
  if (files.length === 0) throw new Error('This book has no downloadable files.');
  return {
    bookId: book.id,
    book,
    files: files.map<PendingFile>((f) => ({
      fileId: f.id,
      url: serveUrl(f.id),
      dest: localFilePath(book.id, f.id, f.format),
      sizeBytes: f.sizeBytes ?? 0,
      format: f.format,
      filename: f.filename ?? null,
      durationSeconds: f.durationSeconds ?? null,
    })),
    coverUrl: book.coverSource ? coverUrl(book.id) : null,
    coverDest: book.coverSource ? coverPath(book.id) : null,
    startedAt: new Date().toISOString(),
  };
}

/**
 * Start downloading a book. The intent is journaled to `pending.json` before any
 * bytes move so an interrupted transfer can be resumed on the next launch.
 */
export async function downloadBook(book: BookDetail, onProgress?: ProgressFn): Promise<DownloadedBook> {
  const pending = buildPending(book);
  await ensureBookDir(book.id);
  await addPending(pending);
  return runDownload(pending, onProgress);
}

export interface ResumeHandlers {
  onStart: (pending: PendingDownload) => void;
  onProgress: (bookId: number, fraction: number) => void;
  onSettled: (bookId: number) => void;
}

/**
 * Resume every journaled download left incomplete by a previous run. Each book is
 * driven through the same path as a fresh download; already-complete files are
 * skipped. Failures are swallowed per-book so one bad entry can't block the rest.
 */
export async function resumeDownloads(handlers: ResumeHandlers): Promise<void> {
  const pendings = await readPending();
  for (const pending of pendings) {
    handlers.onStart(pending);
    try {
      await runDownload(pending, (fraction) => handlers.onProgress(pending.bookId, fraction));
    } catch {
      // Leave the journal entry in place; a later launch retries it.
    } finally {
      handlers.onSettled(pending.bookId);
    }
  }
}

/** Sum the real on-disk sizes, falling back to the server-reported total. */
async function actualSize(files: DownloadedFile[], fallback: number): Promise<number> {
  try {
    const infos = await Promise.all(files.map((f) => getInfoAsync(f.localUri)));
    const sum = infos.reduce((acc, info) => acc + (info.exists ? info.size : 0), 0);
    return sum > 0 ? sum : fallback;
  } catch {
    return fallback;
  }
}

export async function deleteDownload(bookId: number): Promise<void> {
  await removePending(bookId);
  await removeDownload(bookId);
}
