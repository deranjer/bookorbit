// Shared audiobook playback constants. Values mirror the web player's
// AUDIO_READER_DEFAULTS (client/src/features/reader/.../reader-settings.ts) so the
// two clients behave consistently.

export const AUDIO_FORMATS = new Set(['m4b', 'm4a', 'mp3', 'opus', 'ogg', 'flac']);

export const DEFAULT_PLAYBACK_SPEED = 1.0;
export const MIN_PLAYBACK_SPEED = 0.5;
export const MAX_PLAYBACK_SPEED = 3.0;
export const SPEED_PRESETS = [0.75, 1.0, 1.25, 1.5, 2.0] as const;

export const DEFAULT_SKIP_BACK_SECONDS = 10;
export const DEFAULT_SKIP_FORWARD_SECONDS = 30;
export const SKIP_BACK_OPTIONS = [5, 10, 15, 30] as const;
export const SKIP_FORWARD_OPTIONS = [10, 15, 30, 60] as const;

// Match the web player's throttled save cadence (useAudioProgress.ts).
export const PROGRESS_SAVE_THROTTLE_MS = 5000;
