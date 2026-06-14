import {
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';

/**
 * Render settings for the foliate reader. The field set mirrors the web client's
 * ReaderState (client/src/features/reader/epub/composables/useReaderState.ts) so the
 * generated CSS in the WebView bridge behaves identically. The mobile UI only surfaces
 * a curated subset (theme, font size, line height, font family, flow); the rest keep
 * their defaults but are still sent so the bridge can build the full stylesheet.
 */
export interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  fontFamily: string | null;
  maxColumnCount: number;
  gap: number;
  maxInlineSize: number;
  maxBlockSize: number;
  justify: boolean;
  hyphenate: boolean;
  isDark: boolean;
  themeName: string;
  flow: 'paginated' | 'scrolled';
}

// Matches useReaderState defaults, except isDark defaults true to suit the dark app shell.
export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 16,
  lineHeight: 1.5,
  fontFamily: null,
  maxColumnCount: 2,
  gap: 0.05,
  maxInlineSize: 720,
  maxBlockSize: 1440,
  justify: true,
  hyphenate: true,
  isDark: true,
  themeName: 'default',
  flow: 'paginated',
};

export const FONT_SIZE_RANGE = { min: 10, max: 32, step: 1 } as const;
export const LINE_HEIGHT_RANGE = { min: 0.8, max: 3, step: 0.1 } as const;

export const FONT_FAMILIES: { label: string; value: string | null }[] = [
  { label: 'Original', value: null },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Sans', value: '-apple-system, "Helvetica Neue", Arial, sans-serif' },
  { label: 'Monospace', value: 'Menlo, Consolas, monospace' },
];

function settingsPath(): string {
  return `${documentDirectory}reader-settings.json`;
}

export function clampFontSize(v: number): number {
  return Math.max(FONT_SIZE_RANGE.min, Math.min(FONT_SIZE_RANGE.max, Math.round(v)));
}

export function clampLineHeight(v: number): number {
  return Math.max(LINE_HEIGHT_RANGE.min, Math.min(LINE_HEIGHT_RANGE.max, Math.round(v * 10) / 10));
}

export async function loadReaderSettings(): Promise<ReaderSettings> {
  try {
    const info = await getInfoAsync(settingsPath());
    if (!info.exists) return { ...DEFAULT_READER_SETTINGS };
    const parsed = JSON.parse(await readAsStringAsync(settingsPath())) as Partial<ReaderSettings>;
    // Merge over defaults so older saved files missing newer fields stay valid.
    return { ...DEFAULT_READER_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_READER_SETTINGS };
  }
}

export async function saveReaderSettings(settings: ReaderSettings): Promise<void> {
  try {
    await writeAsStringAsync(settingsPath(), JSON.stringify(settings));
  } catch {
    // Persisting settings is best-effort; an in-memory copy still drives the session.
  }
}
