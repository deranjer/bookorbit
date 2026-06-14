import {
  createDownloadResumable,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import type { BookDetail, BookFileRef } from '@/src/api/types';
import { tokenStore } from '@/src/auth/tokenStore';
import { serverUrlStore } from '@/src/auth/serverUrlStore';
import { readableFile } from '@/src/downloads/select';
import { getDownload } from '@/src/downloads/store';

export interface ResolvedReaderFile {
  /** Local file:// URI the WebView can read. */
  uri: string;
  /** Lowercased format (e.g. 'epub'), used for foliate's MIME hint. */
  format: string;
  /** Server file id, used as the progress-sync key. */
  fileId: number;
}

function authHeaders(): Record<string, string> {
  const token = tokenStore.get();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function serveUrl(fileId: number): string {
  const base = serverUrlStore.get() ?? '';
  return `${base}/api/v1/books/files/${fileId}/serve`;
}

function readerCacheRoot(): string {
  return `${documentDirectory}reader-cache/`;
}

function cachePath(bookId: number, fileId: number, format: string): string {
  const ext = format.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  return `${readerCacheRoot()}${bookId}-${fileId}.${ext}`;
}

async function ensureDir(uri: string): Promise<void> {
  const info = await getInfoAsync(uri);
  if (!info.exists) await makeDirectoryAsync(uri, { intermediates: true });
}

/** Local URI of an already-downloaded copy of `file`, if present on disk. */
async function downloadedUri(book: BookDetail, file: BookFileRef): Promise<string | null> {
  const dl = await getDownload(book.id);
  const local = dl?.files.find((f) => f.id === file.id);
  if (!local) return null;
  const info = await getInfoAsync(local.localUri);
  return info.exists ? local.localUri : null;
}

/**
 * Resolve a book to a readable local file. Prefers an offline download; otherwise
 * fetches the file once to a reader cache (reused on reopen) over the authenticated
 * serve endpoint. All networking happens here in RN so the WebView only ever sees a
 * local file:// URI.
 */
export async function resolveReaderFile(
  book: BookDetail,
  onProgress?: (fraction: number) => void,
): Promise<ResolvedReaderFile> {
  const file = readableFile(book);
  if (!file) throw new Error('This book has no readable file.');
  const format = (file.format ?? '').toLowerCase();

  const offline = await downloadedUri(book, file);
  if (offline) {
    onProgress?.(1);
    return { uri: offline, format, fileId: file.id };
  }

  await ensureDir(readerCacheRoot());
  const dest = cachePath(book.id, file.id, format);

  // Reuse a previously cached copy when it matches the server-reported size.
  const existing = await getInfoAsync(dest);
  if (existing.exists && (file.sizeBytes == null || file.sizeBytes <= 0 || existing.size === file.sizeBytes)) {
    onProgress?.(1);
    return { uri: dest, format, fileId: file.id };
  }

  const task = createDownloadResumable(serveUrl(file.id), dest, { headers: authHeaders() }, (p) => {
    if (!onProgress) return;
    if (p.totalBytesExpectedToWrite > 0) onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
  });
  const result = await task.downloadAsync();
  if (!result) throw new Error('Download was interrupted.');
  onProgress?.(1);
  return { uri: result.uri, format, fileId: file.id };
}
