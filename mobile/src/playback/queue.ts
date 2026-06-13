import type { Track } from 'react-native-track-player';
import type { AudiobookChapter, BookDetail, BookFileRef } from '@/src/api/types';
import { AUDIO_FORMATS } from './constants';

// A chapter resolved to absolute seconds across the whole book, with the duration
// of the chapter when the next chapter's start is known.
export interface ResolvedChapter {
  title: string;
  startSec: number;
}

// Position of an absolute (whole-book) offset within a specific file.
export interface FileLocation {
  index: number;
  offsetSec: number;
}

/** Audio content files in server-provided order (sort order is applied server-side). */
export function audioFiles(book: Pick<BookDetail, 'files'>): BookFileRef[] {
  return book.files.filter((f) => f.format != null && AUDIO_FORMATS.has(f.format.toLowerCase()));
}

export function isAudiobook(book: Pick<BookDetail, 'files'>): boolean {
  return audioFiles(book).length > 0;
}

/** Comma-joined narrator names, falling back to authors when no narrators are set. */
export function performerLabel(book: Pick<BookDetail, 'audioMetadata' | 'authors'>): string {
  const narrators = book.audioMetadata?.narrators ?? [];
  if (narrators.length > 0) return narrators.map((n) => n.name).join(', ');
  return book.authors.map((a) => a.name).join(', ');
}

export interface BuildTracksParams {
  baseUrl: string;
  token: string | null;
  /** Map of fileId → local `file://` uri for downloaded books. */
  localFiles?: Map<number, string>;
  /** Local cover uri used for lock-screen artwork (only safe for local files). */
  artwork?: string;
}

/**
 * Map a book's audio files to RNTP tracks. Each file is one track; RNTP manages the
 * full queue natively (skipToNext/Previous advance between files).
 *
 * When a `localFiles` entry exists for a file, the track streams from the on-device
 * copy (no auth header needed) and `artwork` is attached — RNTP's native image loader
 * can render a local cover for the lock screen, unlike the JWT-protected remote cover
 * endpoint, which it cannot send headers for.
 */
export function buildTracks(book: BookDetail, { baseUrl, token, localFiles, artwork }: BuildTracksParams): Track[] {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const artist = performerLabel(book);
  const files = audioFiles(book);
  return files.map((f) => {
    const localUri = localFiles?.get(f.id);
    return {
      id: String(f.id),
      url: localUri ?? `${baseUrl}/api/v1/books/files/${f.id}/serve`,
      headers: localUri ? undefined : headers,
      title: book.title ?? stripExtension(f.filename) ?? 'Audiobook',
      artist,
      artwork: localUri ? artwork : undefined,
      duration: f.durationSeconds ?? undefined,
    };
  });
}

function stripExtension(name: string | null | undefined): string | null {
  if (!name) return null;
  return name.replace(/\.[^.]+$/, '');
}

/** Total book duration in seconds (sum of audio file durations). */
export function totalDurationSec(files: BookFileRef[]): number {
  return files.reduce((sum, f) => sum + (f.durationSeconds ?? 0), 0);
}

/** Convert a (fileIndex, in-file offset) pair to an absolute whole-book offset. */
export function toAbsoluteSec(files: BookFileRef[], index: number, offsetSec: number): number {
  let abs = 0;
  for (let i = 0; i < index && i < files.length; i++) {
    abs += files[i]!.durationSeconds ?? 0;
  }
  return abs + offsetSec;
}

/** Locate an absolute whole-book offset within a specific file. */
export function locateAbsolute(files: BookFileRef[], absoluteSec: number): FileLocation {
  let remaining = Math.max(0, absoluteSec);
  for (let i = 0; i < files.length; i++) {
    const dur = files[i]!.durationSeconds ?? 0;
    if (i === files.length - 1 || remaining < dur) {
      return { index: i, offsetSec: remaining };
    }
    remaining -= dur;
  }
  return { index: 0, offsetSec: 0 };
}

/** Whole-book progress as a 0-100 percentage. */
export function percentageFor(files: BookFileRef[], index: number, offsetSec: number): number {
  const total = totalDurationSec(files);
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (toAbsoluteSec(files, index, offsetSec) / total) * 100));
}

/** Chapters resolved to absolute seconds, sorted by start. */
export function resolveChapters(chapters: AudiobookChapter[] | null | undefined): ResolvedChapter[] {
  if (!chapters || chapters.length === 0) return [];
  return chapters
    .map((c) => ({ title: c.title, startSec: c.startMs / 1000 }))
    .sort((a, b) => a.startSec - b.startSec);
}

/** Index of the chapter containing the given absolute offset, or -1 if none. */
export function currentChapterIndex(chapters: ResolvedChapter[], absoluteSec: number): number {
  let found = -1;
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i]!.startSec <= absoluteSec + 0.001) found = i;
    else break;
  }
  return found;
}
