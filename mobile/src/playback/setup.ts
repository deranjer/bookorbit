import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player';
import { DEFAULT_SKIP_BACK_SECONDS, DEFAULT_SKIP_FORWARD_SECONDS } from './constants';

let setupPromise: Promise<void> | null = null;

/**
 * Initialise the player and remote-control capabilities exactly once per app run.
 * setupPlayer throws if called when the player already exists, so callers should
 * always go through this memoised wrapper.
 */
export function ensurePlayerSetup(): Promise<void> {
  if (!setupPromise) {
    setupPromise = doSetup().catch((err) => {
      // Reset so a later call can retry after a genuine failure.
      setupPromise = null;
      throw err;
    });
  }
  return setupPromise;
}

async function doSetup(): Promise<void> {
  try {
    await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
  } catch {
    // The player was already initialised (e.g. fast refresh / re-entry). Safe to ignore.
  }
  await applyOptions(DEFAULT_SKIP_BACK_SECONDS, DEFAULT_SKIP_FORWARD_SECONDS);
}

/** Update remote-control jump intervals (lock screen / notification skip buttons). */
export async function applyOptions(skipBackSeconds: number, skipForwardSeconds: number): Promise<void> {
  await TrackPlayer.updateOptions({
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.Stop,
      Capability.JumpForward,
      Capability.JumpBackward,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause, Capability.JumpForward, Capability.JumpBackward],
    progressUpdateEventInterval: 1,
    backwardJumpInterval: skipBackSeconds,
    forwardJumpInterval: skipForwardSeconds,
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
    },
  });
}
