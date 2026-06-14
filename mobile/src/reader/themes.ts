// Theme list for the settings UI swatches. Names + colors mirror the web client
// (client/src/features/reader/epub/constants/themes.ts) and the THEMES table inside
// assets/reader/bridge.js.txt, which is what actually styles the rendered text. Keep
// the three in sync.
export interface ReaderTheme {
  name: string;
  label: string;
  light: { fg: string; bg: string };
  dark: { fg: string; bg: string };
}

export const READER_THEMES: ReaderTheme[] = [
  { name: 'default', label: 'Default', light: { fg: '#000000', bg: '#ffffff' }, dark: { fg: '#e0e0e0', bg: '#222222' } },
  { name: 'gray', label: 'Gray', light: { fg: '#222222', bg: '#e0e0e0' }, dark: { fg: '#c6c6c6', bg: '#444444' } },
  { name: 'sepia', label: 'Sepia', light: { fg: '#5b4636', bg: '#f1e8d0' }, dark: { fg: '#ffd595', bg: '#342e25' } },
  { name: 'crimson', label: 'Crimson', light: { fg: '#2f1f25', bg: '#fdf1f4' }, dark: { fg: '#f3dbe2', bg: '#3a252d' } },
  { name: 'meadow', label: 'Meadow', light: { fg: '#232c16', bg: '#d7dbbd' }, dark: { fg: '#d8deba', bg: '#333627' } },
  { name: 'rosewood', label: 'Rosewood', light: { fg: '#4e1609', bg: '#f0d1d5' }, dark: { fg: '#e5c4c8', bg: '#462f32' } },
  { name: 'azure', label: 'Azure', light: { fg: '#262d48', bg: '#cedef5' }, dark: { fg: '#babee1', bg: '#282e47' } },
  { name: 'dawnlight', label: 'Dawnlight', light: { fg: '#586e75', bg: '#fdf6e3' }, dark: { fg: '#93a1a1', bg: '#002b36' } },
  { name: 'ember', label: 'Ember', light: { fg: '#3c3836', bg: '#fbf1c7' }, dark: { fg: '#ebdbb2', bg: '#282828' } },
  { name: 'aurora', label: 'Aurora', light: { fg: '#2e3440', bg: '#eceff4' }, dark: { fg: '#d8dee9', bg: '#2e3440' } },
  { name: 'ocean', label: 'Ocean', light: { fg: '#0a4d4d', bg: '#e0f7fa' }, dark: { fg: '#b2dfdb', bg: '#263238' } },
  { name: 'mist', label: 'Mist', light: { fg: '#4a148c', bg: '#f3e5f5' }, dark: { fg: '#c7b6dd', bg: '#3a3150' } },
  { name: 'amoled', label: 'AMOLED', light: { fg: '#000000', bg: '#ffffff' }, dark: { fg: '#ffffff', bg: '#000000' } },
];

/** Resolve the background color a theme renders for the given mode — used to tint the reader surface. */
export function themeBackground(themeName: string, isDark: boolean): string {
  const theme = READER_THEMES.find((t) => t.name === themeName) ?? READER_THEMES[0]!;
  return isDark ? theme.dark.bg : theme.light.bg;
}
