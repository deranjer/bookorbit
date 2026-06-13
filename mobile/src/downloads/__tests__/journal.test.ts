import type { BookDetail } from '@/src/api/types';
import type { PendingDownload } from '../journal';

const mockFsText = new Map<string, string>();
const mockFsDirs = new Set<string>();

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  getInfoAsync: jest.fn(async (uri: string) => {
    if (mockFsText.has(uri)) return { exists: true, uri, size: mockFsText.get(uri)!.length, isDirectory: false };
    if (mockFsDirs.has(uri)) return { exists: true, uri, size: 0, isDirectory: true };
    return { exists: false, uri, isDirectory: false };
  }),
  makeDirectoryAsync: jest.fn(async (uri: string) => {
    mockFsDirs.add(uri);
  }),
  readAsStringAsync: jest.fn(async (uri: string) => {
    if (!mockFsText.has(uri)) throw new Error('not found');
    return mockFsText.get(uri)!;
  }),
  writeAsStringAsync: jest.fn(async (uri: string, contents: string) => {
    mockFsText.set(uri, contents);
  }),
  deleteAsync: jest.fn(),
}));

// eslint-disable-next-line import/first -- module under test must load after the FS mock vars are defined
import { addPending, readPending, removePending } from '../journal';

function makePending(bookId: number): PendingDownload {
  return {
    bookId,
    book: { id: bookId, title: `Book ${bookId}` } as BookDetail,
    files: [{ fileId: 10, url: 'http://h/serve', dest: 'file:///doc/downloads/1/10.m4b', sizeBytes: 100, format: 'm4b', filename: null, durationSeconds: 60 }],
    coverUrl: null,
    coverDest: null,
    startedAt: '2026-06-12T00:00:00.000Z',
  };
}

describe('downloads journal', () => {
  beforeEach(() => {
    mockFsText.clear();
    mockFsDirs.clear();
  });

  it('starts empty', async () => {
    expect(await readPending()).toEqual([]);
  });

  it('adds and reads back a pending download', async () => {
    await addPending(makePending(1));
    const all = await readPending();
    expect(all).toHaveLength(1);
    expect(all[0]!.bookId).toBe(1);
  });

  it('replaces an entry with the same bookId', async () => {
    await addPending(makePending(1));
    await addPending(makePending(1));
    expect(await readPending()).toHaveLength(1);
  });

  it('removes a single entry, leaving others', async () => {
    await addPending(makePending(1));
    await addPending(makePending(2));
    await removePending(1);
    expect((await readPending()).map((p) => p.bookId)).toEqual([2]);
  });
});
