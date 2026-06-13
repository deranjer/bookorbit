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
  deleteAsync: jest.fn(),
}));

jest.mock('@/src/api/books', () => ({ saveAudioProgress: jest.fn() }));

/* eslint-disable import/first -- modules under test must load after the mocks above */
import { saveAudioProgress } from '@/src/api/books';
import {
  flushPendingProgress,
  getLocalProgress,
  markSynced,
  saveLocalProgress,
} from '../offlineProgress';
/* eslint-enable import/first */

const mockSave = saveAudioProgress as jest.MockedFunction<typeof saveAudioProgress>;

const sample = { currentFileId: 10, positionSeconds: 42, percentage: 13 };

describe('offlineProgress', () => {
  beforeEach(() => {
    mockFsFiles.clear();
    mockFsDirs.clear();
    mockSave.mockReset();
  });

  it('saves a position as dirty and reads it back', async () => {
    await saveLocalProgress(1, sample);
    const local = await getLocalProgress(1);
    expect(local).toMatchObject({ ...sample, dirty: true });
    expect(typeof local!.updatedAt).toBe('number');
  });

  it('markSynced clears the dirty flag', async () => {
    await saveLocalProgress(1, sample);
    await markSynced(1);
    expect((await getLocalProgress(1))?.dirty).toBe(false);
  });

  it('flushes only dirty entries and marks them synced on success', async () => {
    mockSave.mockResolvedValue(undefined);
    await saveLocalProgress(1, sample);
    await saveLocalProgress(2, { ...sample, currentFileId: 20 });
    await markSynced(2); // 2 is already clean

    const synced = await flushPendingProgress();

    expect(synced).toBe(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(1, sample);
    expect((await getLocalProgress(1))?.dirty).toBe(false);
  });

  it('keeps entries dirty when the server save fails', async () => {
    mockSave.mockRejectedValue(new Error('offline'));
    await saveLocalProgress(1, sample);

    const synced = await flushPendingProgress();

    expect(synced).toBe(0);
    expect((await getLocalProgress(1))?.dirty).toBe(true);
  });
});
