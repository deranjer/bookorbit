import type { BookDetail, BookFileRef } from '@/src/api/types';
import type { PendingDownload } from '../journal';

// In-memory filesystem: media files tracked by size, JSON files by text content.
const mockSizes = new Map<string, number>();
const mockText = new Map<string, string>();
const mockDirs = new Set<string>();
// Size a simulated download writes to its destination, keyed by dest uri.
const mockDownloadSize = new Map<string, number>();
// Destinations that actually ran a transfer (so we can assert skips).
const mockDownloaded: string[] = [];

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  FileSystemSessionType: { BACKGROUND: 'background' },
  getInfoAsync: jest.fn(async (uri: string) => {
    if (mockText.has(uri)) return { exists: true, uri, size: mockText.get(uri)!.length, isDirectory: false };
    if (mockSizes.has(uri)) return { exists: true, uri, size: mockSizes.get(uri)!, isDirectory: false };
    if (mockDirs.has(uri)) return { exists: true, uri, size: 0, isDirectory: true };
    return { exists: false, uri, isDirectory: false };
  }),
  makeDirectoryAsync: jest.fn(async (uri: string) => {
    mockDirs.add(uri);
  }),
  readAsStringAsync: jest.fn(async (uri: string) => {
    if (!mockText.has(uri)) throw new Error('not found');
    return mockText.get(uri)!;
  }),
  writeAsStringAsync: jest.fn(async (uri: string, contents: string) => {
    mockText.set(uri, contents);
  }),
  deleteAsync: jest.fn(async (uri: string) => {
    mockSizes.delete(uri);
    mockText.delete(uri);
  }),
  createDownloadResumable: jest.fn((_url: string, dest: string) => ({
    downloadAsync: async () => {
      mockSizes.set(dest, mockDownloadSize.get(dest) ?? 1);
      mockDownloaded.push(dest);
      return { uri: dest };
    },
  })),
}));

jest.mock('@/src/auth/tokenStore', () => ({ tokenStore: { get: () => 'tok' } }));
jest.mock('@/src/auth/serverUrlStore', () => ({ serverUrlStore: { get: () => 'http://host' } }));

/* eslint-disable import/first -- modules under test must load after the mocks above */
import { downloadBook, resumeDownloads } from '../manager';
import { readPending } from '../journal';
import { getDownload } from '../store';
/* eslint-enable import/first */

function file(id: number, sizeBytes: number): BookFileRef {
  return { id, format: 'mp3', role: 'content', sizeBytes, durationSeconds: 60, filename: `f${id}.mp3` };
}

function book(): BookDetail {
  return {
    id: 5,
    libraryId: 1,
    libraryName: 'Lib',
    status: 'ready',
    addedAt: '',
    title: 'My Audiobook',
    subtitle: null,
    description: null,
    isbn10: null,
    isbn13: null,
    publisher: null,
    publishedYear: null,
    language: null,
    pageCount: null,
    seriesId: null,
    seriesName: null,
    seriesIndex: null,
    rating: null,
    coverSource: null,
    providerIds: {},
    authors: [{ id: 1, name: 'Author One', sortName: null }],
    genres: [],
    tags: [],
    files: [file(50, 100), file(51, 200)],
    audioMetadata: null,
  };
}

const DEST_50 = 'file:///doc/downloads/5/50.mp3';
const DEST_51 = 'file:///doc/downloads/5/51.mp3';

describe('download manager', () => {
  beforeEach(() => {
    mockSizes.clear();
    mockText.clear();
    mockDirs.clear();
    mockDownloadSize.clear();
    mockDownloaded.length = 0;
    mockDownloadSize.set(DEST_50, 100);
    mockDownloadSize.set(DEST_51, 200);
  });

  it('downloads every file, finalises the record, and clears the journal', async () => {
    const entry = await downloadBook(book());

    expect(mockDownloaded).toEqual([DEST_50, DEST_51]);
    expect(entry).toMatchObject({ bookId: 5, isAudiobook: true, sizeBytes: 300 });
    expect(entry.files.map((f) => f.id)).toEqual([50, 51]);
    expect((await getDownload(5))?.title).toBe('My Audiobook');
    expect(await readPending()).toEqual([]); // journal cleared
  });

  it('resumes a journaled download, skipping files already complete on disk', async () => {
    // First file is already fully on disk from a previous (interrupted) run.
    mockSizes.set(DEST_50, 100);
    const pending: PendingDownload = {
      bookId: 5,
      book: book(),
      files: [
        { fileId: 50, url: 'http://host/api/v1/books/files/50/serve', dest: DEST_50, sizeBytes: 100, format: 'mp3', filename: 'f50.mp3', durationSeconds: 60 },
        { fileId: 51, url: 'http://host/api/v1/books/files/51/serve', dest: DEST_51, sizeBytes: 200, format: 'mp3', filename: 'f51.mp3', durationSeconds: 60 },
      ],
      coverUrl: null,
      coverDest: null,
      startedAt: '2026-06-12T00:00:00.000Z',
    };
    mockText.set('file:///doc/downloads/pending.json', JSON.stringify([pending]));

    const onStart = jest.fn();
    const onSettled = jest.fn();
    await resumeDownloads({ onStart, onProgress: jest.fn(), onSettled });

    // Only the missing file is fetched; the complete one is skipped.
    expect(mockDownloaded).toEqual([DEST_51]);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onSettled).toHaveBeenCalledWith(5);
    expect((await getDownload(5))?.files).toHaveLength(2);
    expect(await readPending()).toEqual([]); // journal cleared after finalise
  });
});
