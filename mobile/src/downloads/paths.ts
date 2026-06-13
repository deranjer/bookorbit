import { documentDirectory } from 'expo-file-system/legacy';

/**
 * On-device layout for downloaded books:
 *
 *   <documentDirectory>downloads/
 *     index.json                  ← every download as a full DownloadedBook[] record
 *     progress.json               ← offline listening-position queue (see offlineProgress.ts)
 *     <bookId>/
 *       <fileId>.<ext>            ← one file per downloaded book file
 *       cover.jpg                 ← cached cover for offline display / lock-screen art
 */
export function downloadsRoot(): string {
  return `${documentDirectory}downloads/`;
}

export function bookDir(bookId: number): string {
  return `${downloadsRoot()}${bookId}/`;
}

export function indexPath(): string {
  return `${downloadsRoot()}index.json`;
}

export function coverPath(bookId: number): string {
  return `${bookDir(bookId)}cover.jpg`;
}

/** Local file name for a book file, keyed by file id with the original extension. */
export function localFilePath(bookId: number, fileId: number, format: string | null): string {
  const ext = (format ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  return `${bookDir(bookId)}${fileId}.${ext}`;
}
