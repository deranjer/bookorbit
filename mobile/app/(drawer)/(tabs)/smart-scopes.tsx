import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BookGrid } from '@/src/components/BookGrid';
import { getSmartScopes, getSmartScopeBooks } from '@/src/api/smartScopes';
import { PAGE_SIZE, useInfinitePage } from '@/src/lib/useInfinitePage';
import { Colors } from '@/src/constants/colors';

export default function SmartScopesScreen() {
  const { data: scopes, refetch: refetchScopes, isFetching: isFetchingScopes } = useQuery({
    queryKey: ['smartScopes'],
    queryFn: getSmartScopes,
  });
  const [activeId, setActiveId] = useState<number | null>(null);

  const selectedId = activeId ?? scopes?.[0]?.id ?? null;

  const {
    items: books,
    total,
    refetch: refetchBooks,
    isFetching: isFetchingBooks,
    isFetchingNextPage,
    loadMore,
  } = useInfinitePage({
    queryKey: ['smartScopeBooks', selectedId],
    fetchPage: (page) => getSmartScopeBooks(selectedId!, { page, size: PAGE_SIZE }),
    enabled: selectedId !== null,
  });

  const refetch = () => {
    refetchScopes();
    refetchBooks();
  };

  if (!scopes || scopes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Smart Scopes</Text>
        <Text style={styles.emptyBody}>Create smart scopes in the web app to automatically group books by rules.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
        {scopes.map((scope) => (
          <Pressable
            key={scope.id}
            style={[styles.tab, selectedId === scope.id && styles.tabActive]}
            onPress={() => setActiveId(scope.id)}
          >
            <Text style={[styles.tabText, selectedId === scope.id && styles.tabTextActive]}>{scope.name}</Text>
            {scope.bookCount !== undefined && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{scope.bookCount}</Text>
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
        refreshing={(isFetchingBooks && !isFetchingNextPage) || isFetchingScopes}
        onRefresh={refetch}
        onEndReached={loadMore}
        loadingMore={isFetchingNextPage}
        isLoading={isFetchingBooks && books.length === 0}
        emptyText="No books match this scope."
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
