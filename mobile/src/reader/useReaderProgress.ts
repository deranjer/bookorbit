import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { saveFileProgress } from '@/src/api/reader';
import { READER_PROGRESS_SAVE_THROTTLE_MS } from './constants';
import { flushPendingProgress, markSynced, saveLocalProgress } from './offlineProgress';

interface PendingSave {
  cfi: string | null;
  percentage: number;
}

/**
 * Persists reading position for the open file. The reader screen calls `report` on every
 * foliate relocate; saves are throttled (~2s) and always written locally first, then
 * pushed to the server. An immediate flush runs on background and unmount, and queued
 * offline positions drain when the app returns to the foreground.
 */
export function useReaderProgress(fileId: number | null): { report: (cfi: string | null, percentage: number) => void } {
  const fileIdRef = useRef<number | null>(fileId);
  const lastSavedRef = useRef(0);
  const pendingRef = useRef<PendingSave | null>(null);

  useEffect(() => {
    fileIdRef.current = fileId;
    lastSavedRef.current = 0;
    pendingRef.current = null;
  }, [fileId]);

  const flush = useCallback(async () => {
    const fid = fileIdRef.current;
    const pending = pendingRef.current;
    if (fid == null || !pending) return;
    pendingRef.current = null;
    lastSavedRef.current = Date.now();
    // Local first so the position survives offline + app restart.
    await saveLocalProgress(fid, pending).catch(() => {});
    try {
      await saveFileProgress(fid, pending);
      await markSynced(fid).catch(() => {});
    } catch {
      // Server unreachable: the local copy stays dirty and flushes on reconnect/foreground.
    }
  }, []);

  const report = useCallback(
    (cfi: string | null, percentage: number) => {
      pendingRef.current = { cfi, percentage };
      if (Date.now() - lastSavedRef.current >= READER_PROGRESS_SAVE_THROTTLE_MS) void flush();
    },
    [flush],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') void flush();
      else if (next === 'active') void flushPendingProgress();
    });
    return () => {
      sub.remove();
      void flush();
    };
  }, [flush]);

  return { report };
}
