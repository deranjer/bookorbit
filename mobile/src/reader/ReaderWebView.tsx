import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { ensureReaderAssets, readerReadAccessRoot } from './assets';
import {
  jsBegin,
  jsChunk,
  jsCommand,
  jsCommit,
  parseReaderEvent,
  type ReaderCommand,
  type ReaderEvent,
} from './bridge';
import type { ReaderSettings } from './settings';

// Base64 is streamed in slices so a large book never rides in a single injectJavaScript
// call (which can fail/crash on big payloads). Length must stay a multiple of 4 so each
// slice decodes independently in the WebView.
const CHUNK_CHARS = 720_000;

export interface OpenParams {
  fileUri: string;
  format: string;
  cfi: string | null;
  fraction: number | null;
  settings: ReaderSettings;
}

export interface ReaderViewHandle {
  open(params: OpenParams): Promise<void>;
  goTo(target: string | number): void;
  goToFraction(value: number): void;
  next(): void;
  prev(): void;
  applyStyles(settings: ReaderSettings): void;
}

interface ReaderWebViewProps {
  onReady?: () => void;
  onLoaded?: (event: Extract<ReaderEvent, { type: 'loaded' }>) => void;
  onRelocate?: (event: Extract<ReaderEvent, { type: 'relocate' }>) => void;
  onError?: (message: string) => void;
}

export const ReaderWebView = forwardRef<ReaderViewHandle, ReaderWebViewProps>(function ReaderWebView(
  { onReady, onLoaded, onRelocate, onError },
  ref,
) {
  const webviewRef = useRef<WebView>(null);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const readyRef = useRef(false);
  // An open requested before the bridge signals 'ready' is buffered and run on ready.
  const pendingOpenRef = useRef<OpenParams | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureReaderAssets()
      .then((uri) => {
        if (!cancelled) setSourceUri(uri);
      })
      .catch((e) => onError?.(e instanceof Error ? e.message : 'Failed to prepare reader'));
    return () => {
      cancelled = true;
    };
  }, [onError]);

  const inject = useCallback((js: string) => {
    webviewRef.current?.injectJavaScript(js);
  }, []);

  const sendCommand = useCallback(
    (cmd: ReaderCommand) => {
      if (readyRef.current) inject(jsCommand(cmd));
    },
    [inject],
  );

  const runOpen = useCallback(
    async (params: OpenParams) => {
      const base64 = await readAsStringAsync(params.fileUri, { encoding: 'base64' });
      inject(jsBegin({ format: params.format, cfi: params.cfi, fraction: params.fraction, settings: params.settings }));
      for (let i = 0; i < base64.length; i += CHUNK_CHARS) {
        inject(jsChunk(base64.slice(i, i + CHUNK_CHARS)));
      }
      inject(jsCommit());
    },
    [inject],
  );

  useImperativeHandle(
    ref,
    () => ({
      open: async (params: OpenParams) => {
        if (!readyRef.current) {
          // Buffer until the bridge is ready; flushed in the 'ready' handler.
          pendingOpenRef.current = params;
          return;
        }
        await runOpen(params);
      },
      goTo: (target) => sendCommand({ type: 'goTo', target }),
      goToFraction: (value) => sendCommand({ type: 'goToFraction', value }),
      next: () => sendCommand({ type: 'next' }),
      prev: () => sendCommand({ type: 'prev' }),
      applyStyles: (settings) => sendCommand({ type: 'applyStyles', settings }),
    }),
    [runOpen, sendCommand],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const parsed = parseReaderEvent(event.nativeEvent.data);
      if (!parsed) return;
      switch (parsed.type) {
        case 'ready': {
          readyRef.current = true;
          onReady?.();
          const buffered = pendingOpenRef.current;
          if (buffered) {
            pendingOpenRef.current = null;
            void runOpen(buffered);
          }
          break;
        }
        case 'loaded':
          onLoaded?.(parsed);
          break;
        case 'relocate':
          onRelocate?.(parsed);
          break;
        case 'error':
          onError?.(parsed.message);
          break;
      }
    },
    [onReady, onLoaded, onRelocate, onError, runOpen],
  );

  if (!sourceUri) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        source={{ uri: sourceUri }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        // file:// access so the WebView can module-import the foliate assets we copied.
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        // iOS: grant read access to documentDirectory (reader assets + cached book files).
        allowingReadAccessToURL={readerReadAccessRoot()}
        onMessage={handleMessage}
        onError={(e) => onError?.(e.nativeEvent.description ?? 'WebView error')}
        style={styles.webview}
        // The host page is a fixed full-screen surface; foliate manages its own scroll.
        scrollEnabled={false}
        overScrollMode="never"
        bounces={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});
