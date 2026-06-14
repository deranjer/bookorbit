const mockFsEntries = new Map<string, number>(); // uri -> size (presence = exists)
const mockDownloadCalls: { url: string; dest: string }[] = [];

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  getInfoAsync: jest.fn(async (uri: string) =>
    mockFsEntries.has(uri) ? { exists: true, uri, size: mockFsEntries.get(uri) } : { exists: false, uri },
  ),
  makeDirectoryAsync: jest.fn(async (uri: string) => {
    mockFsEntries.set(uri, 0);
  }),
  createDownloadResumable: jest.fn((url: string, dest: string) => ({
    downloadAsync: async () => {
      mockDownloadCalls.push({ url, dest });
      mockFsEntries.set(dest, 123);
      return { uri: dest };
    },
  })),
}));

const mockGetDownload = jest.fn();
jest.mock('@/src/downloads/store', () => ({ getDownload: (...a: unknown[]) => mockGetDownload(...a) }));

/* eslint-disable import/first -- modules under test must load after the mocks above */
import type { BookDetail } from '@/src/api/types';
import { serverUrlStore } from '@/src/auth/serverUrlStore';
import { tokenStore } from '@/src/auth/tokenStore';
import { resolveReaderFile } from '../source';
/* eslint-enable import/first */

function bookWithEpub(): BookDetail {
  return {
    id: 42,
    files: [{ id: 8, format: 'epub', role: 'primary', sizeBytes: 123 }],
  } as unknown as BookDetail;
}

describe('resolveReaderFile', () => {
  beforeEach(() => {
    mockFsEntries.clear();
    mockDownloadCalls.length = 0;
    mockGetDownload.mockReset();
    serverUrlStore.set('http://server');
    tokenStore.set('tok');
  });

  it('uses the offline download when the file exists on disk', async () => {
    mockGetDownload.mockResolvedValue({ files: [{ id: 8, localUri: 'file:///doc/downloads/42/8.epub' }] });
    mockFsEntries.set('file:///doc/downloads/42/8.epub', 123);

    const result = await resolveReaderFile(bookWithEpub());

    expect(result).toEqual({ uri: 'file:///doc/downloads/42/8.epub', format: 'epub', fileId: 8 });
    expect(mockDownloadCalls).toHaveLength(0);
  });

  it('downloads to the reader cache when not downloaded', async () => {
    mockGetDownload.mockResolvedValue(null);

    const result = await resolveReaderFile(bookWithEpub());

    expect(result).toEqual({ uri: 'file:///doc/reader-cache/42-8.epub', format: 'epub', fileId: 8 });
    expect(mockDownloadCalls).toEqual([
      { url: 'http://server/api/v1/books/files/8/serve', dest: 'file:///doc/reader-cache/42-8.epub' },
    ]);
  });

  it('reuses a cached copy that matches the expected size', async () => {
    mockGetDownload.mockResolvedValue(null);
    mockFsEntries.set('file:///doc/reader-cache/42-8.epub', 123);

    const result = await resolveReaderFile(bookWithEpub());

    expect(result.uri).toBe('file:///doc/reader-cache/42-8.epub');
    expect(mockDownloadCalls).toHaveLength(0);
  });

  it('throws when the book has no readable file', async () => {
    const book = { id: 1, files: [{ id: 2, format: 'pdf', role: 'primary', sizeBytes: 1 }] } as unknown as BookDetail;
    await expect(resolveReaderFile(book)).rejects.toThrow(/no readable file/i);
  });
});
