import type { BookDetail } from '@/src/api/types';

export interface DownloadedFile {
  id: number;
  localUri: string;
  filename: string | null;
  format: string | null;
  durationSeconds: number | null;
}

/**
 * A fully downloaded book. The complete `book` (BookDetail) is persisted so the
 * player and Downloads list render entirely offline — titles, narrators, chapters
 * and per-file durations all come from here when there is no network.
 */
export interface DownloadedBook {
  bookId: number;
  title: string | null;
  authors: string[];
  narrators: string[];
  isAudiobook: boolean;
  /** Primary format label for the type badge (e.g. 'm4b', 'epub', 'pdf'). */
  format: string | null;
  sizeBytes: number;
  downloadedAt: string;
  coverLocalUri: string | null;
  files: DownloadedFile[];
  book: BookDetail;
}
