import { useCallback, useEffect, useState } from 'react';
import { secureStorage } from '@/src/auth/storage';
import { DEFAULT_FILTERS, DEFAULT_SORT, type LibraryFilters, type LibrarySort } from './filterTypes';

const KEY_PREFIX = 'libraryFilters:v1:';

interface StoredPrefs {
  filters: LibraryFilters;
  sort: LibrarySort;
}

// Persists each library's filters + sort across app restarts. The payload is a
// few hundred bytes, well within SecureStore's limits, so we reuse the existing
// secureStorage wrapper rather than adding AsyncStorage.
export function useLibraryFilterPrefs(libraryId: number | null) {
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<LibrarySort>(DEFAULT_SORT);

  useEffect(() => {
    if (libraryId == null) return;
    let cancelled = false;

    secureStorage
      .getItemAsync(KEY_PREFIX + libraryId)
      .then((raw) => {
        if (cancelled) return;
        if (!raw) {
          setFilters(DEFAULT_FILTERS);
          setSort(DEFAULT_SORT);
          return;
        }
        try {
          const parsed = JSON.parse(raw) as StoredPrefs;
          setFilters({ ...DEFAULT_FILTERS, ...parsed.filters });
          setSort(parsed.sort ?? DEFAULT_SORT);
        } catch {
          setFilters(DEFAULT_FILTERS);
          setSort(DEFAULT_SORT);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFilters(DEFAULT_FILTERS);
          setSort(DEFAULT_SORT);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [libraryId]);

  const apply = useCallback(
    (next: { filters: LibraryFilters; sort: LibrarySort }) => {
      setFilters(next.filters);
      setSort(next.sort);
      if (libraryId != null) {
        secureStorage.setItemAsync(KEY_PREFIX + libraryId, JSON.stringify(next)).catch(() => {});
      }
    },
    [libraryId],
  );

  return { filters, sort, apply };
}
