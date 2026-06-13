import { useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { BookGrid } from '@/src/components/BookGrid';
import { FilterSortSheet } from '@/src/components/FilterSortSheet';
import { getLibraries, getLibraryBooks } from '@/src/api/libraries';
import { buildBookQuery, countActiveFilters } from '@/src/features/library-filters/buildBookQuery';
import { useLibraryFilterPrefs } from '@/src/features/library-filters/useLibraryFilterPrefs';
import { PAGE_SIZE, useInfinitePage } from '@/src/lib/useInfinitePage';
import { Colors } from '@/src/constants/colors';

export default function LibrariesScreen() {
  const {
    data: libraries,
    isLoading: librariesLoading,
    refetch: refetchLibraries,
    isFetching: librariesFetching,
  } = useQuery({ queryKey: ['libraries'], queryFn: getLibraries });
  const [activeId, setActiveId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const selectedId = activeId ?? libraries?.[0]?.id ?? null;
  const selectedLibrary = libraries?.find((lib) => lib.id === selectedId) ?? null;
  const hasMultiple = (libraries?.length ?? 0) > 1;

  const { filters, sort, apply } = useLibraryFilterPrefs(selectedId);
  const activeFilterCount = countActiveFilters(filters);
  const query = buildBookQuery(filters, sort, { page: 0, size: PAGE_SIZE });

  const {
    items: books,
    total,
    refetch: refetchBooks,
    isFetching,
    isFetchingNextPage,
    loadMore,
  } = useInfinitePage({
    queryKey: ['libraryBooks', selectedId, query.sort, query.filter],
    fetchPage: (page) => getLibraryBooks(selectedId!, { page, size: PAGE_SIZE, sort: query.sort, filter: query.filter }),
    enabled: selectedId !== null,
  });

  const bookCount = total ?? selectedLibrary?.bookCount ?? null;

  const refresh = () => {
    refetchLibraries();
    refetchBooks();
  };

  if (!librariesLoading && (!libraries || libraries.length === 0)) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={librariesFetching} onRefresh={refetchLibraries} tintColor={Colors.accent} />
        }
      >
        <Text style={styles.emptyTitle}>No Libraries</Text>
        <Text style={styles.emptyBody}>Create a library in the web app, then pull down to refresh.</Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current library + dropdown selector + filter trigger */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerSelector}
          onPress={() => hasMultiple && setPickerOpen(true)}
          disabled={!hasMultiple}
        >
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedLibrary?.name ?? 'Library'}
            </Text>
            {bookCount !== null && (
              <Text style={styles.headerCount}>
                {bookCount} {bookCount === 1 ? 'book' : 'books'}
              </Text>
            )}
          </View>
          {hasMultiple && <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />}
        </Pressable>

        <Pressable
          style={styles.filterButton}
          onPress={() => setSheetOpen(true)}
          disabled={selectedId === null}
          hitSlop={8}
        >
          <Ionicons name="options-outline" size={22} color={Colors.text} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.sheet}>
            {libraries?.map((lib) => (
              <Pressable
                key={lib.id}
                style={styles.sheetRow}
                onPress={() => {
                  setActiveId(lib.id);
                  setPickerOpen(false);
                }}
              >
                <Text style={[styles.sheetText, lib.id === selectedId && styles.sheetTextActive]} numberOfLines={1}>
                  {lib.name}
                </Text>
                {lib.id === selectedId && <Ionicons name="checkmark" size={20} color={Colors.accent} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <FilterSortSheet
        visible={sheetOpen}
        filters={filters}
        sort={sort}
        onClose={() => setSheetOpen(false)}
        onApply={apply}
      />

      <BookGrid
        books={books}
        refreshing={(isFetching && !isFetchingNextPage) || librariesFetching}
        onRefresh={refresh}
        onEndReached={loadMore}
        loadingMore={isFetchingNextPage}
        isLoading={isFetching && books.length === 0}
        emptyText="No books in this library."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  emptyContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: '700', marginBottom: 12 },
  emptyBody: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerSelector: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterButton: { padding: 4 },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: '#ffffff', fontSize: 10, fontWeight: '700' },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  headerCount: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', paddingTop: 96, paddingHorizontal: 16 },
  sheet: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  sheetText: { color: Colors.text, fontSize: 16, flexShrink: 1 },
  sheetTextActive: { color: Colors.accent, fontWeight: '600' },
});
