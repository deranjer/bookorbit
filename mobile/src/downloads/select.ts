import type { BookDetail, BookFileRef } from '@/src/api/types';
import { audioFiles, isAudiobook } from '@/src/playback/queue';

// Formats the app can hand off to an external viewer via the OS share sheet.
export const EBOOK_OPENABLE = new Set(['epub', 'pdf', 'cbz', 'cbr', 'mobi', 'azw3', 'azw', 'fb2', 'txt']);

// Formats the in-app foliate reader can render. PDF is excluded (no RN viewer yet);
// azw/txt are excluded as foliate support is unreliable for them.
export const READER_SUPPORTED = new Set(['epub', 'mobi', 'azw3', 'fb2', 'cbz', 'cbr']);

/**
 * The book files to persist for offline use. Audiobooks download every audio file
 * (the player queues them in order); other books download the single primary file
 * (the one the details page surfaces), falling back to the first non-audio file.
 */
export function downloadableFiles(book: BookDetail): BookFileRef[] {
  if (isAudiobook(book)) return audioFiles(book);
  const primary = book.files.find((f) => f.role === 'primary');
  if (primary) return [primary];
  const audioIds = new Set(audioFiles(book).map((f) => f.id));
  const firstNonAudio = book.files.find((f) => !audioIds.has(f.id));
  return firstNonAudio ? [firstNonAudio] : [];
}

/** Primary format label for the type badge (e.g. 'm4b', 'epub'). */
export function primaryFormat(book: BookDetail): string | null {
  const files = downloadableFiles(book);
  return files[0]?.format ?? null;
}

export function isOpenableEbook(format: string | null): boolean {
  return format != null && EBOOK_OPENABLE.has(format.toLowerCase());
}

export function isReadableEbook(format: string | null): boolean {
  return format != null && READER_SUPPORTED.has(format.toLowerCase());
}

/** True when the book has at least one file the in-app reader can open. */
export function isReadable(book: BookDetail): boolean {
  return readableFile(book) != null;
}

/**
 * The file to open in the in-app reader: the primary file when it's a readable format,
 * otherwise the first readable file. Null when nothing is supported.
 */
export function readableFile(book: BookDetail): BookFileRef | null {
  const primary = book.files.find((f) => f.role === 'primary');
  if (primary && isReadableEbook(primary.format)) return primary;
  return book.files.find((f) => isReadableEbook(f.format)) ?? null;
}
