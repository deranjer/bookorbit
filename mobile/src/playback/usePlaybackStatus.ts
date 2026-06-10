import { useEffect, useState } from 'react';
import TrackPlayer, { State } from 'react-native-track-player';

export interface PlaybackStatus {
  playing: boolean;
  buffering: boolean;
}

/**
 * Pure mapping of (playWhenReady, state) to UI play/buffering flags. Mirrors RNTP's
 * own determineIsPlaying logic. Extracted for unit testing.
 */
export function derivePlaybackStatus(playWhenReady: boolean, state: State | undefined): PlaybackStatus {
  if (state === undefined) return { playing: false, buffering: false };
  const isLoading = state === State.Loading || state === State.Buffering;
  const isErrored = state === State.Error;
  const isEnded = state === State.Ended;
  const isNone = state === State.None;
  return {
    playing: playWhenReady && !(isErrored || isEnded || isNone),
    buffering: playWhenReady && isLoading,
  };
}

const POLL_MS = 400;

/**
 * Polls play/buffering status instead of relying on RNTP's event hooks
 * (usePlaybackState / useIsPlaying). Those update only via native events, which are
 * not reliably delivered under the New Architecture (bridgeless) — leaving the
 * Play/Pause icon stuck. Polling getPlaybackState/getPlayWhenReady (the same approach
 * RNTP's own useProgress takes) is reliable. Only runs while a book is active.
 */
export function usePlaybackStatus(active: boolean): PlaybackStatus {
  const [status, setStatus] = useState<PlaybackStatus>({ playing: false, buffering: false });

  useEffect(() => {
    if (!active) {
      setStatus({ playing: false, buffering: false });
      return;
    }
    let mounted = true;
    const tick = async () => {
      try {
        const [playbackState, playWhenReady] = await Promise.all([
          TrackPlayer.getPlaybackState(),
          TrackPlayer.getPlayWhenReady(),
        ]);
        if (!mounted) return;
        const next = derivePlaybackStatus(playWhenReady, playbackState.state);
        setStatus((prev) =>
          prev.playing === next.playing && prev.buffering === next.buffering ? prev : next,
        );
      } catch {
        // Player not set up yet — ignore until the next tick.
      }
    };
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [active]);

  return status;
}
