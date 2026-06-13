import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Event, State, useTrackPlayerEvents } from 'react-native-track-player';
import type { BookDetail, BookFileRef } from '@/src/api/types';
import { saveAudioProgress } from '@/src/api/books';
import { PROGRESS_SAVE_THROTTLE_MS } from './constants';
import { flushPendingProgress, markSynced, saveLocalProgress } from './offlineProgress';
import { audioFiles, percentageFor } from './queue';

interface PendingSave {
  bookId: number;
  currentFileId: number;
  positionSeconds: number;
  percentage: number;
}

/**
 * Persists whole-book listening progress to the server while a book is loaded.
 * Mirrors the web player's useAudioProgress: throttled saves (every 5s), plus an
 * immediate flush on pause/stop and when the app is backgrounded or torn down.
 */
export function useProgressSync(book: BookDetail | null): void {
  const filesRef = useRef<BookFileRef[]>([]);
  const bookIdRef = useRef<number | null>(null);
  const lastSavedRef = useRef(0);
  const pendingRef = useRef<PendingSave | null>(null);

  useEffect(() => {
    filesRef.current = book ? audioFiles(book) : [];
    bookIdRef.current = book?.id ?? null;
    // New book loaded: reset throttle so the first tick can save promptly.
    lastSavedRef.current = 0;
    pendingRef.current = null;
  }, [book]);

  const flush = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    lastSavedRef.current = Date.now();
    const body = {
      percentage: pending.percentage,
      currentFileId: pending.currentFileId,
      positionSeconds: pending.positionSeconds,
    };
    // Always record locally first so the position survives offline + app restart.
    await saveLocalProgress(pending.bookId, body).catch(() => {});
    try {
      await saveAudioProgress(pending.bookId, body);
      await markSynced(pending.bookId).catch(() => {});
    } catch {
      // Server unreachable: the local copy stays dirty and is flushed on
      // reconnect/foreground. No need to re-queue in pendingRef.
    }
  }, []);

  useTrackPlayerEvents([Event.PlaybackProgressUpdated, Event.PlaybackState], async (event) => {
    if (event.type === Event.PlaybackState) {
      if (event.state === State.Paused || event.state === State.Stopped || event.state === State.Ended) {
        await flush();
      }
      return;
    }

    // PlaybackProgressUpdated carries the active track index and in-file position.
    const bookId = bookIdRef.current;
    const files = filesRef.current;
    const file = files[event.track];
    if (bookId == null || !file) return;

    pendingRef.current = {
      bookId,
      currentFileId: file.id,
      positionSeconds: event.position,
      percentage: percentageFor(files, event.track, event.position),
    };

    if (Date.now() - lastSavedRef.current >= PROGRESS_SAVE_THROTTLE_MS) {
      await flush();
    }
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        void flush();
      } else if (next === 'active') {
        // Returning to the app is a good moment to drain any queued offline saves.
        void flushPendingProgress();
      }
    });
    return () => {
      sub.remove();
      void flush();
    };
  }, [flush]);
}
