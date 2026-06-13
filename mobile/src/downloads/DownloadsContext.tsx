import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { BookDetail } from '@/src/api/types';
import { deleteDownload, downloadBook, resumeDownloads } from './manager';
import { listDownloads } from './store';
import type { DownloadedBook } from './types';

export interface ActiveDownload {
  title: string | null;
  /** 0..1 progress fraction. */
  fraction: number;
}

interface DownloadsContextValue {
  downloads: DownloadedBook[];
  /** In-flight downloads keyed by bookId. */
  active: Record<number, ActiveDownload>;
  isDownloaded: (bookId: number) => boolean;
  isDownloading: (bookId: number) => boolean;
  progressFor: (bookId: number) => number | undefined;
  getDownload: (bookId: number) => DownloadedBook | undefined;
  startDownload: (book: BookDetail) => Promise<void>;
  removeDownload: (bookId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

const DownloadsContext = createContext<DownloadsContextValue | null>(null);

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadedBook[]>([]);
  const [active, setActive] = useState<Record<number, ActiveDownload>>({});
  // Guards against double-starting a download for the same book.
  const inFlight = useRef<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    setDownloads(await listDownloads());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Resume any download interrupted by a previous app kill — once per app run.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    void resumeDownloads({
      onStart: (pending) => {
        if (inFlight.current.has(pending.bookId)) return;
        inFlight.current.add(pending.bookId);
        setActive((prev) => ({ ...prev, [pending.bookId]: { title: pending.book.title, fraction: 0 } }));
      },
      onProgress: (bookId, fraction) => {
        setActive((prev) => (bookId in prev ? { ...prev, [bookId]: { ...prev[bookId]!, fraction } } : prev));
      },
      onSettled: (bookId) => {
        inFlight.current.delete(bookId);
        setActive((prev) => {
          const next = { ...prev };
          delete next[bookId];
          return next;
        });
        void refresh();
      },
    });
  }, [refresh]);

  const startDownload = useCallback(
    async (book: BookDetail) => {
      if (inFlight.current.has(book.id)) return;
      inFlight.current.add(book.id);
      setActive((prev) => ({ ...prev, [book.id]: { title: book.title, fraction: 0 } }));
      try {
        await downloadBook(book, (fraction) => {
          setActive((prev) => ({ ...prev, [book.id]: { title: book.title, fraction } }));
        });
        await refresh();
      } finally {
        inFlight.current.delete(book.id);
        setActive((prev) => {
          const next = { ...prev };
          delete next[book.id];
          return next;
        });
      }
    },
    [refresh],
  );

  const removeDownloadCb = useCallback(
    async (bookId: number) => {
      await deleteDownload(bookId);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo<DownloadsContextValue>(
    () => ({
      downloads,
      active,
      isDownloaded: (bookId) => downloads.some((d) => d.bookId === bookId),
      isDownloading: (bookId) => bookId in active,
      progressFor: (bookId) => active[bookId]?.fraction,
      getDownload: (bookId) => downloads.find((d) => d.bookId === bookId),
      startDownload,
      removeDownload: removeDownloadCb,
      refresh,
    }),
    [downloads, active, startDownload, removeDownloadCb, refresh],
  );

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

export function useDownloads(): DownloadsContextValue {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error('useDownloads must be used within a DownloadsProvider');
  return ctx;
}
