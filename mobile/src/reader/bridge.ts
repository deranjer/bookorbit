import type { ReaderSettings } from './settings';

/**
 * Typed message protocol between React Native and the in-WebView foliate bridge
 * (assets/reader/bridge.js.txt).
 *
 * RN -> WebView: JS strings injected via WebView.injectJavaScript, invoking globals the
 * bridge installs. Every snippet ends in `true;` so injectJavaScript doesn't warn.
 * WebView -> RN: JSON strings posted through window.ReactNativeWebView.postMessage and
 * received by WebView.onMessage.
 */

export interface TocItem {
  label: string;
  href: string | null;
  subitems: TocItem[];
}

export interface ReaderLocation {
  current: number;
  next: number;
  total: number;
}

export type ReaderEvent =
  | { type: 'ready' }
  | { type: 'loaded'; toc: TocItem[]; metadata: { title: string | null; language: string | null } }
  | {
      type: 'relocate';
      cfi: string | null;
      fraction: number | null;
      chapterTitle: string | null;
      location: ReaderLocation | null;
    }
  | { type: 'error'; message: string };

export interface OpenMeta {
  format: string;
  cfi: string | null;
  fraction: number | null;
  settings: ReaderSettings;
}

export type ReaderCommand =
  | { type: 'goTo'; target: string | number }
  | { type: 'goToFraction'; value: number }
  | { type: 'prev' }
  | { type: 'next' }
  | { type: 'applyStyles'; settings: ReaderSettings };

/** Parse a WebView postMessage payload into a typed event, or null if unrecognized. */
export function parseReaderEvent(data: string): ReaderEvent | null {
  try {
    const parsed = JSON.parse(data) as ReaderEvent;
    if (parsed && typeof parsed === 'object' && typeof parsed.type === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

// Embed `value` as a JS string literal (double-encoded: JSON value -> JS string arg).
function asJsString(value: unknown): string {
  return JSON.stringify(JSON.stringify(value));
}

export function jsBegin(meta: OpenMeta): string {
  return `window.__readerBegin && window.__readerBegin(${asJsString(meta)});true;`;
}

export function jsChunk(base64: string): string {
  // Base64 chars (+ / =) are all safe inside a double-quoted JS string literal.
  return `window.__readerChunk && window.__readerChunk("${base64}");true;`;
}

export function jsCommit(): string {
  return `window.__readerCommit && window.__readerCommit();true;`;
}

export function jsCommand(cmd: ReaderCommand): string {
  return `window.__readerCommand && window.__readerCommand(${asJsString(cmd)});true;`;
}
