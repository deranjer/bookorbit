import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBookDetail } from '@/src/api/books';
import { Colors } from '@/src/constants/colors';
import { ReaderWebView, type ReaderViewHandle } from '@/src/reader/ReaderWebView';
import { ReaderTocSheet } from '@/src/reader/components/ReaderTocSheet';
import { ReaderSettingsSheet } from '@/src/reader/components/ReaderSettingsSheet';
import { resolveReaderFile } from '@/src/reader/source';
import { resolveInitialProgress } from '@/src/reader/offlineProgress';
import { useReaderProgress } from '@/src/reader/useReaderProgress';
import { DEFAULT_READER_SETTINGS, loadReaderSettings, saveReaderSettings, type ReaderSettings } from '@/src/reader/settings';
import { themeBackground } from '@/src/reader/themes';
import type { TocItem } from '@/src/reader/bridge';

interface Resolved {
  fileUri: string;
  format: string;
  fileId: number;
  cfi: string | null;
  fraction: number | null;
  settings: ReaderSettings;
}

export default function ReaderScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const bookId = Number(id);

  const viewRef = useRef<ReaderViewHandle>(null);
  const openedRef = useRef(false);

  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [webviewReady, setWebviewReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [downloadFraction, setDownloadFraction] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [chromeVisible, setChromeVisible] = useState(true);
  const [tocVisible, setTocVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [chapterTitle, setChapterTitle] = useState<string | null>(null);
  const [percentage, setPercentage] = useState(0);

  const { data: book, isError: bookError } = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => getBookDetail(bookId),
    enabled: Number.isFinite(bookId),
  });

  const { report } = useReaderProgress(resolved?.fileId ?? null);

  // Resolve the book to a local file + initial position once the detail loads.
  useEffect(() => {
    if (!book || resolved) return;
    let cancelled = false;
    (async () => {
      try {
        const loadedSettings = await loadReaderSettings();
        const file = await resolveReaderFile(book, (f) => {
          if (!cancelled) setDownloadFraction(f);
        });
        const initial = await resolveInitialProgress(file.fileId);
        if (cancelled) return;
        setSettings(loadedSettings);
        setResolved({
          fileUri: file.uri,
          format: file.format,
          fileId: file.fileId,
          cfi: initial.cfi,
          fraction: initial.fraction,
          settings: loadedSettings,
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not open this book.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book, resolved]);

  // Hand the file to the WebView once both the bridge and the file are ready.
  useEffect(() => {
    if (!webviewReady || !resolved || openedRef.current) return;
    openedRef.current = true;
    void viewRef.current?.open({
      fileUri: resolved.fileUri,
      format: resolved.format,
      cfi: resolved.cfi,
      fraction: resolved.fraction,
      settings: resolved.settings,
    });
  }, [webviewReady, resolved]);

  const handleRelocate = useCallback(
    (event: { cfi: string | null; fraction: number | null; chapterTitle: string | null }) => {
      if (typeof event.fraction === 'number') setPercentage(Math.round(event.fraction * 100));
      setChapterTitle(event.chapterTitle);
      if (event.cfi != null && typeof event.fraction === 'number') {
        report(event.cfi, event.fraction * 100);
      }
    },
    [report],
  );

  const applySettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      viewRef.current?.applyStyles(next);
      void saveReaderSettings(next);
      return next;
    });
  }, []);

  const goToToc = useCallback((href: string) => {
    setTocVisible(false);
    viewRef.current?.goTo(href);
  }, []);

  const paginated = settings.flow === 'paginated';
  const showChrome = chromeVisible || !paginated;
  const surface = themeBackground(settings.themeName, settings.isDark);

  return (
    <View style={[styles.container, { backgroundColor: surface }]}>
      <ReaderWebView
        ref={viewRef}
        onReady={() => setWebviewReady(true)}
        onLoaded={(e) => {
          setToc(e.toc);
          setLoaded(true);
        }}
        onRelocate={handleRelocate}
        onError={setError}
      />

      {/* Tap zones for paging + chrome toggle (paginated mode only, so scroll mode can scroll). */}
      {paginated && !tocVisible && !settingsVisible && (
        <View style={styles.tapLayer} pointerEvents="box-none">
          <Pressable style={styles.tapSide} onPress={() => viewRef.current?.prev()} />
          <Pressable style={styles.tapCenter} onPress={() => setChromeVisible((v) => !v)} />
          <Pressable style={styles.tapSide} onPress={() => viewRef.current?.next()} />
        </View>
      )}

      {/* Header */}
      {showChrome && (
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={26} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chapterTitle ?? book?.title ?? ''}
          </Text>
          <Pressable onPress={() => setTocVisible(true)} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="list" size={24} color={Colors.text} />
          </Pressable>
          <Pressable onPress={() => setSettingsVisible(true)} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="text" size={22} color={Colors.text} />
          </Pressable>
        </View>
      )}

      {/* Footer */}
      {showChrome && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 6 }]}>
          <Text style={styles.footerText}>{percentage}%</Text>
        </View>
      )}

      {/* Loading / error overlay */}
      {!loaded && !error && (
        <View style={[styles.overlay, { backgroundColor: surface }]}>
          <ActivityIndicator size="large" color={Colors.accent} />
          {downloadFraction > 0 && downloadFraction < 1 && (
            <Text style={styles.overlayText}>Downloading {Math.round(downloadFraction * 100)}%</Text>
          )}
        </View>
      )}

      {(error || bookError) && (
        <View style={[styles.overlay, { backgroundColor: surface }]}>
          <Ionicons name="alert-circle-outline" size={40} color={Colors.error} />
          <Text style={styles.overlayText}>{error ?? 'Failed to load book'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryText}>Go back</Text>
          </Pressable>
        </View>
      )}

      <ReaderTocSheet visible={tocVisible} toc={toc} onSelect={goToToc} onClose={() => setTocVisible(false)} />
      <ReaderSettingsSheet
        visible={settingsVisible}
        settings={settings}
        onChange={applySettings}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tapLayer: { ...StyleSheet.absoluteFillObject, flexDirection: 'row' },
  tapSide: { flex: 0.3 },
  tapCenter: { flex: 0.4 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(10,10,10,0.85)',
  },
  iconBtn: { padding: 6 },
  headerTitle: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '600' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 6,
    backgroundColor: 'rgba(10,10,10,0.85)',
  },
  footerText: { color: Colors.textSecondary, fontSize: 12 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  overlayText: { color: Colors.text, fontSize: 14, textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.surface, borderRadius: 8 },
  retryText: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
});
