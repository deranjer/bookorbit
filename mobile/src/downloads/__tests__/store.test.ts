import type { BookDetail } from '@/src/api/types';
import type { DownloadedBook } from '../types';

// In-memory filesystem backing the legacy expo-file-system mock.
const mockFsFiles = new Map<string, string>();
const mockFsDirs = new Set<string>();

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  getInfoAsync: jest.fn(async (uri: string) => {
    if (mockFsFiles.has(uri)) return { exists: true, uri, size: mockFsFiles.get(uri)!.length, isDirectory: false };
    if (mockFsDirs.has(uri)) return { exists: true, uri, size: 0, isDirectory: true };
    return { exists: false, uri, isDirectory: false };
  }),
  makeDirectoryAsync: jest.fn(async (uri: string) => {
    mockFsDirs.add(uri);
  }),
  readAsStringAsync: jest.fn(async (uri: string) => {
    if (!mockFsFiles.has(uri)) throw new Error('not found');
    return mockFsFiles.get(uri)!;
  }),
  writeAsStringAsync: jest.fn(async (uri: string, contents: string) => {
    mockFsFiles.set(uri, contents);
  }),
  deleteAsync: jest.fn(async (uri: string) => {
    for (const key of [...mockFsFiles.keys()]) if (key.startsWith(uri)) mockFsFiles.delete(key);
    for (const key of [...mockFsDirs]) if (key.startsWith(uri)) mockFsDirs.delete(key);
  }),
}));

// eslint-disable-next-line import/first -- module under test must load after the FS mock vars are defined
import { getDownload, isDownloaded, listDownloads, removeDownload, upsertDownload } from '../store';

function makeEntry(bookId: number, title: string): DownloadedBook {
  return {
    bookId,
    title,
    authors: ['Author'],
    narrators: [],
    isAudiobook: true,
    format: 'm4b',
    sizeBytes: 1234,
    downloadedAt: '2026-06-12T00:00:00.000Z',
    coverLocalUri: null,
    files: [{ id: 10, localUri: 'file:///doc/downloads/1/10.m4b', filename: null, format: 'm4b', durationSeconds: 60 }],
    book: { id: bookId } as BookDetail,
  };
}

describe('downloads store', () => {
  beforeEach(() => {
    mockFsFiles.clear();
    mockFsDirs.clear();
  });

  it('returns an empty list when nothing is downloaded', async () => {
    expect(await listDownloads()).toEqual([]);
    expect(await isDownloaded(1)).toBe(false);
  });

  it('upserts, reads back, and reports downloaded state', async () => {
    await upsertDownload(makeEntry(1, 'Dune'));
    expect(await isDownloaded(1)).toBe(true);
    expect((await getDownload(1))?.title).toBe('Dune');
  });

  it('replaces an entry with the same bookId rather than duplicating', async () => {
    await upsertDownload(makeEntry(1, 'Dune'));
    await upsertDownload(makeEntry(1, 'Dune (re-downloaded)'));
    const all = await listDownloads();
    expect(all).toHaveLength(1);
    expect(all[0]!.title).toBe('Dune (re-downloaded)');
  });

  it('removes an entry and deletes its files', async () => {
    await upsertDownload(makeEntry(1, 'Dune'));
    await upsertDownload(makeEntry(2, 'Foundation'));
    const remaining = await removeDownload(1);
    expect(remaining.map((d) => d.bookId)).toEqual([2]);
    expect(await isDownloaded(1)).toBe(false);
  });

  it('tolerates a corrupt index file', async () => {
    mockFsFiles.set('file:///doc/downloads/index.json', '{not json');
    expect(await listDownloads()).toEqual([]);
  });
});
