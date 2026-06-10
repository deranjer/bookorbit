import { secureStorage } from '@/src/auth/storage';
import {
  DEFAULT_PLAYBACK_SPEED,
  DEFAULT_SKIP_BACK_SECONDS,
  DEFAULT_SKIP_FORWARD_SECONDS,
  MAX_PLAYBACK_SPEED,
  MIN_PLAYBACK_SPEED,
} from './constants';

const SPEED_KEY = 'bookorbit_audio_speed';
const SKIP_BACK_KEY = 'bookorbit_audio_skip_back';
const SKIP_FORWARD_KEY = 'bookorbit_audio_skip_forward';

export interface AudioSettings {
  speed: number;
  skipBackSeconds: number;
  skipForwardSeconds: number;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  speed: DEFAULT_PLAYBACK_SPEED,
  skipBackSeconds: DEFAULT_SKIP_BACK_SECONDS,
  skipForwardSeconds: DEFAULT_SKIP_FORWARD_SECONDS,
};

export function clampSpeed(value: number): number {
  return Math.min(MAX_PLAYBACK_SPEED, Math.max(MIN_PLAYBACK_SPEED, value));
}

function parseNumber(raw: string | null, fallback: number): number {
  if (raw == null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function loadAudioSettings(): Promise<AudioSettings> {
  const [speed, skipBack, skipForward] = await Promise.all([
    secureStorage.getItemAsync(SPEED_KEY),
    secureStorage.getItemAsync(SKIP_BACK_KEY),
    secureStorage.getItemAsync(SKIP_FORWARD_KEY),
  ]);
  return {
    speed: clampSpeed(parseNumber(speed, DEFAULT_PLAYBACK_SPEED)),
    skipBackSeconds: parseNumber(skipBack, DEFAULT_SKIP_BACK_SECONDS),
    skipForwardSeconds: parseNumber(skipForward, DEFAULT_SKIP_FORWARD_SECONDS),
  };
}

export function saveAudioSpeed(value: number): Promise<void> {
  return secureStorage.setItemAsync(SPEED_KEY, String(clampSpeed(value)));
}

export function saveSkipBackSeconds(value: number): Promise<void> {
  return secureStorage.setItemAsync(SKIP_BACK_KEY, String(value));
}

export function saveSkipForwardSeconds(value: number): Promise<void> {
  return secureStorage.setItemAsync(SKIP_FORWARD_KEY, String(value));
}
