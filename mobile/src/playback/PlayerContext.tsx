import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { addNetworkStateListener } from 'expo-network';
import TrackPlayer, { State, type Track } from 'react-native-track-player';
import type { AudioProgress, BookDetail, BookFileRef } from '@/src/api/types';
import { getAudioProgress, getBookDetail } from '@/src/api/books';
import { tokenStore } from '@/src/auth/tokenStore';
import { serverUrlStore } from '@/src/auth/serverUrlStore';
import { getDownload } from '@/src/downloads/store';
import {
  audioFiles,
  buildTracks,
  isAudiobook,
  locateAbsolute,
  resolveChapters,
  totalDurationSec,
  type ResolvedChapter,
} from './queue';
import { flushPendingProgress, getLocalProgress } from './offlineProgress';
import { applyOptions, ensurePlayerSetup } from './setup';
import { usePlaybackStatus } from './usePlaybackStatus';
import {
  clampSpeed,
  DEFAULT_AUDIO_SETTINGS,
  loadAudioSettings,
  saveAudioSpeed,
  saveSkipBackSeconds,
  saveSkipForwardSeconds,
} from './settings';
import { useProgressSync } from './useProgressSync';

interface PlayerContextValue {
  currentBook: BookDetail | null;
  isActive: boolean;
  files: BookFileRef[];
  chapters: ResolvedChapter[];
  totalDuration: number;
  isPlaying: boolean;
  isBuffering: boolean;
  // Settings
  speed: number;
  skipBackSeconds: number;
  skipForwardSeconds: number;
  // Actions
  loadAndPlay: (bookId: number) => Promise<void>;
  stop: () => Promise<void>;
  togglePlay: () => Promise<void>;
  skipBack: () => Promise<void>;
  skipForward: () => Promise<void>;
  seekToAbsolute: (absoluteSec: number) => Promise<void>;
  setSpeed: (value: number) => Promise<void>;
  setSkipBackSeconds: (value: number) => Promise<void>;
  setSkipForwardSeconds: (value: number) => Promise<void>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

/**
 * Choose the resume position: the local copy when it hasn't synced yet (it's at
 * least as new as the server) or the server is unreachable; otherwise the server's.
 */
async function resolveResumeProgress(bookId: number): Promise<AudioProgress | null> {
  const server = await getAudioProgress(bookId).catch(() => null);
  const local = await getLocalProgress(bookId).catch(() => null);
  if (local && (local.dirty || !server)) return local;
  return server;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [currentBook, setCurrentBook] = useState<BookDetail | null>(null);
  const [settings, setSettings] = useState(DEFAULT_AUDIO_SETTINGS);
  const speedRef = useRef(DEFAULT_AUDIO_SETTINGS.speed);

  // Polled status (play/buffering). See usePlaybackStatus for why polling is used
  // instead of RNTP's event-based hooks.
  const { playing: isPlaying, buffering: isBuffering } = usePlaybackStatus(currentBook != null);

  useProgressSync(currentBook);

  // Load persisted settings once.
  useEffect(() => {
    void loadAudioSettings().then((loaded) => {
      setSettings(loaded);
      speedRef.current = loaded.speed;
    });
  }, []);

  // Drain any queued offline progress on startup and whenever connectivity returns.
  useEffect(() => {
    void flushPendingProgress();
    const sub = addNetworkStateListener(({ isConnected, isInternetReachable }) => {
      if (isConnected && isInternetReachable !== false) void flushPendingProgress();
    });
    return () => sub.remove();
  }, []);

  const files = useMemo(() => (currentBook ? audioFiles(currentBook) : []), [currentBook]);
  const chapters = useMemo(
    () => resolveChapters(currentBook?.audioMetadata?.chapters),
    [currentBook],
  );
  const totalDuration = useMemo(() => totalDurationSec(files), [files]);

  const loadAndPlay = useCallback(
    async (bookId: number) => {
      await ensurePlayerSetup();

      // Prefer an on-device copy: it plays offline and supplies lock-screen artwork.
      const download = await getDownload(bookId).catch(() => null);

      let book: BookDetail;
      let tracks: Track[];
      if (download) {
        book = download.book;
        if (!isAudiobook(book)) return;
        tracks = buildTracks(book, {
          baseUrl: serverUrlStore.get() ?? '',
          token: tokenStore.get(),
          localFiles: new Map(download.files.map((f) => [f.id, f.localUri])),
          artwork: download.coverLocalUri ?? undefined,
        });
      } else {
        book = await queryClient.fetchQuery({
          queryKey: ['book', bookId],
          queryFn: () => getBookDetail(bookId),
        });
        if (!isAudiobook(book)) return;
        tracks = buildTracks(book, {
          baseUrl: serverUrlStore.get() ?? '',
          token: tokenStore.get(),
        });
      }

      const bookFiles = audioFiles(book);
      const progress = await resolveResumeProgress(bookId);

      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      await TrackPlayer.setRate(speedRef.current);

      if (progress) {
        const index = bookFiles.findIndex((f) => f.id === progress.currentFileId);
        if (index > 0) await TrackPlayer.skip(index);
        if (progress.positionSeconds > 0) await TrackPlayer.seekTo(progress.positionSeconds);
      }

      setCurrentBook(book);
      await TrackPlayer.play();
    },
    [queryClient],
  );

  const stop = useCallback(async () => {
    await TrackPlayer.reset().catch(() => {});
    setCurrentBook(null);
  }, []);

  const togglePlay = useCallback(async () => {
    const state = (await TrackPlayer.getPlaybackState()).state;
    if (state === State.Playing) await TrackPlayer.pause();
    else await TrackPlayer.play();
  }, []);

  const skipBack = useCallback(async () => {
    const { position } = await TrackPlayer.getProgress();
    await TrackPlayer.seekTo(Math.max(0, position - settings.skipBackSeconds));
  }, [settings.skipBackSeconds]);

  const skipForward = useCallback(async () => {
    const { position, duration } = await TrackPlayer.getProgress();
    const target = position + settings.skipForwardSeconds;
    await TrackPlayer.seekTo(duration > 0 ? Math.min(duration, target) : target);
  }, [settings.skipForwardSeconds]);

  const seekToAbsolute = useCallback(
    async (absoluteSec: number) => {
      if (files.length === 0) return;
      const loc = locateAbsolute(files, absoluteSec);
      const index = await TrackPlayer.getActiveTrackIndex();
      if (index !== loc.index) await TrackPlayer.skip(loc.index);
      await TrackPlayer.seekTo(loc.offsetSec);
    },
    [files],
  );

  const setSpeed = useCallback(async (value: number) => {
    const clamped = clampSpeed(value);
    speedRef.current = clamped;
    setSettings((s) => ({ ...s, speed: clamped }));
    await ensurePlayerSetup();
    await TrackPlayer.setRate(clamped);
    await saveAudioSpeed(clamped);
  }, []);

  const setSkipBackSecondsValue = useCallback(
    async (value: number) => {
      setSettings((s) => ({ ...s, skipBackSeconds: value }));
      await ensurePlayerSetup();
      await applyOptions(value, settings.skipForwardSeconds);
      await saveSkipBackSeconds(value);
    },
    [settings.skipForwardSeconds],
  );

  const setSkipForwardSecondsValue = useCallback(
    async (value: number) => {
      setSettings((s) => ({ ...s, skipForwardSeconds: value }));
      await ensurePlayerSetup();
      await applyOptions(settings.skipBackSeconds, value);
      await saveSkipForwardSeconds(value);
    },
    [settings.skipBackSeconds],
  );

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentBook,
      isActive: currentBook != null,
      files,
      chapters,
      totalDuration,
      isPlaying,
      isBuffering,
      speed: settings.speed,
      skipBackSeconds: settings.skipBackSeconds,
      skipForwardSeconds: settings.skipForwardSeconds,
      loadAndPlay,
      stop,
      togglePlay,
      skipBack,
      skipForward,
      seekToAbsolute,
      setSpeed,
      setSkipBackSeconds: setSkipBackSecondsValue,
      setSkipForwardSeconds: setSkipForwardSecondsValue,
    }),
    [
      currentBook,
      files,
      chapters,
      totalDuration,
      isPlaying,
      isBuffering,
      settings,
      loadAndPlay,
      stop,
      togglePlay,
      skipBack,
      skipForward,
      seekToAbsolute,
      setSpeed,
      setSkipBackSecondsValue,
      setSkipForwardSecondsValue,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider');
  return ctx;
}
