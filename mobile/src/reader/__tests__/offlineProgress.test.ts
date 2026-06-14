const mockFsFiles = new Map<string, string>();

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///doc/',
  getInfoAsync: jest.fn(async (uri: string) => {
    if (mockFsFiles.has(uri)) return { exists: true, uri, size: mockFsFiles.get(uri)!.length };
    return { exists: false, uri };
  }),
  readAsStringAsync: jest.fn(async (uri: string) => {
    if (!mockFsFiles.has(uri)) throw new Error('not found');
    return mockFsFiles.get(uri)!;
  }),
  writeAsStringAsync: jest.fn(async (uri: string, contents: string) => {
    mockFsFiles.set(uri, contents);
  }),
}));

jest.mock('@/src/api/reader', () => ({
  getFileProgress: jest.fn(),
  saveFileProgress: jest.fn(),
}));

/* eslint-disable import/first -- modules under test must load after the mocks above */
import { getFileProgress, saveFileProgress } from '@/src/api/reader';
import {
  flushPendingProgress,
  getLocalProgress,
  markSynced,
  resolveInitialProgress,
  saveLocalProgress,
} from '../offlineProgress';
/* eslint-enable import/first */

const mockSave = saveFileProgress as jest.MockedFunction<typeof saveFileProgress>;
const mockGet = getFileProgress as jest.MockedFunction<typeof getFileProgress>;

const sample = { cfi: 'epubcfi(/6/4!/2)', percentage: 42 };

describe('reader offlineProgress', () => {
  beforeEach(() => {
    mockFsFiles.clear();
    mockSave.mockReset();
    mockGet.mockReset();
  });

  it('saves a position as dirty and reads it back', async () => {
    await saveLocalProgress(7, sample);
    const local = await getLocalProgress(7);
    expect(local).toMatchObject({ ...sample, dirty: true });
    expect(typeof local!.updatedAt).toBe('number');
  });

  it('markSynced clears the dirty flag', async () => {
    await saveLocalProgress(7, sample);
    await markSynced(7);
    expect((await getLocalProgress(7))?.dirty).toBe(false);
  });

  it('flushes only dirty entries and marks them synced on success', async () => {
    mockSave.mockResolvedValue(undefined);
    await saveLocalProgress(1, sample);
    await saveLocalProgress(2, { cfi: null, percentage: 10 });
    await markSynced(2);

    const synced = await flushPendingProgress();

    expect(synced).toBe(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith(1, { cfi: sample.cfi, percentage: sample.percentage });
    expect((await getLocalProgress(1))?.dirty).toBe(false);
  });

  it('keeps entries dirty when the server save fails', async () => {
    mockSave.mockRejectedValue(new Error('offline'));
    await saveLocalProgress(1, sample);

    expect(await flushPendingProgress()).toBe(0);
    expect((await getLocalProgress(1))?.dirty).toBe(true);
  });

  describe('resolveInitialProgress', () => {
    it('prefers a not-yet-synced local position over the server', async () => {
      await saveLocalProgress(5, { cfi: 'local', percentage: 80 });
      mockGet.mockResolvedValue({ cfi: 'server', percentage: 20, pageNumber: null });

      const initial = await resolveInitialProgress(5);

      expect(initial).toEqual({ cfi: 'local', fraction: 0.8 });
    });

    it('falls back to the server when there is no dirty local copy', async () => {
      await saveLocalProgress(5, { cfi: 'local', percentage: 80 });
      await markSynced(5);
      mockGet.mockResolvedValue({ cfi: 'server', percentage: 30, pageNumber: null });

      const initial = await resolveInitialProgress(5);

      expect(initial).toEqual({ cfi: 'server', fraction: 0.3 });
    });

    it('returns the start when nothing is known', async () => {
      mockGet.mockResolvedValue(null);
      expect(await resolveInitialProgress(99)).toEqual({ cfi: null, fraction: null });
    });
  });
});
