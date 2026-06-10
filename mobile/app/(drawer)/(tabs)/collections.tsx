import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BookGrid } from '@/src/components/BookGrid';
import { getCollections, getCollectionBooks } from '@/src/api/collections';
import { PAGE_SIZE, useInfinitePage } from '@/src/lib/useInfinitePage';
import { Colors } from '@/src/constants/colors';

export default function CollectionsScreen() {
  const {
    data: collections,
    refetch: refetchCollections,
    isFetching: collectionsFetching,
  } = useQuery({ queryKey: ['collections'], queryFn: getCollections });
  const [activeId, setActiveId] = useState<number | null>(null);

  const selectedId = activeId ?? collections?.[0]?.id ?? null;

  const {
    items: books,
    total,
    refetch: refetchBooks,
    isFetching,
    isFetchingNextPage,
    loadMore,
  } = useInfinitePage({
    queryKey: ['collectionBooks', selectedId],
    fetchPage: (page) => getCollectionBooks(selectedId!, { page, size: PAGE_SIZE }),
    enabled: selectedId !== null,
  });

  const refresh = () => {
    refetchCollections();
    refetchBooks();
  };

  if (!collections || collections.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={collectionsFetching} onRefresh={refetchCollections} tintColor={Colors.accent} />
        }
      >
        <Text style={styles.emptyTitle}>No Collections</Text>
        <Text style={styles.emptyBody}>Create a collection in the web app, then pull down to refresh.</Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {collections.map((collection) => (
          <Pressable
            key={collection.id}
            style={[styles.tab, selectedId === collection.id && styles.tabActive]}
            onPress={() => setActiveId(collection.id)}
          >
            <Text style={[styles.tabText, selectedId === collection.id && styles.tabTextActive]}>{collection.name}</Text>
            {collection.bookCount !== undefined && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{collection.bookCount}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {selectedId !== null && total !== null && (
        <Text style={styles.totalText}>{total} books</Text>
      )}

      <BookGrid
        books={books}
        refreshing={(isFetching && !isFetchingNextPage) || collectionsFetching}
        onRefresh={refresh}
        onEndReached={loadMore}
        loadingMore={isFetchingNextPage}
        isLoading={isFetching && books.length === 0}
        emptyText="No books in this collection."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  emptyContainer: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: '700', marginBottom: 12 },
  emptyBody: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  tabs: { borderBottomWidth: 1, borderBottomColor: Colors.border, maxHeight: 52 },
  tabsContent: { paddingHorizontal: 8, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginHorizontal: 4 },
  tabActive: { backgroundColor: Colors.accent },
  tabText: { color: Colors.textSecondary, fontSize: 14 },
  tabTextActive: { color: '#fff', fontWeight: '600' },
  countBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 6 },
  countText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  totalText: { color: Colors.textSecondary, fontSize: 13, marginHorizontal: 16, marginTop: 8, marginBottom: 4 },
});
