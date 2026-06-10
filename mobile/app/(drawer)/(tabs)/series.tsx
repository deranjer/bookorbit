import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BookGrid } from '@/src/components/BookGrid';
import { getSeries, getSeriesBooks } from '@/src/api/series';
import { PAGE_SIZE, useInfinitePage } from '@/src/lib/useInfinitePage';
import { Colors } from '@/src/constants/colors';
import type { SeriesSummary } from '@/src/api/types';

function SeriesBooks({ series, onBack }: { series: SeriesSummary; onBack: () => void }) {
  const { items: books, refetch, isFetching, isFetchingNextPage, loadMore } = useInfinitePage({
    queryKey: ['seriesBooks', series.name],
    fetchPage: (page) => getSeriesBooks(series.name, { page, size: PAGE_SIZE }),
  });

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backRow} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={Colors.accent} />
        <Text style={styles.backText} numberOfLines={1}>{series.name}</Text>
      </Pressable>
      <BookGrid
        books={books}
        refreshing={isFetching && !isFetchingNextPage}
        onRefresh={refetch}
        onEndReached={loadMore}
        loadingMore={isFetchingNextPage}
        isLoading={isFetching && books.length === 0}
        emptyText="No books in this series."
      />
    </View>
  );
}

export default function SeriesScreen() {
  const { items: series, refetch, isFetching, isFetchingNextPage, loadMore } = useInfinitePage({
    queryKey: ['series'],
    fetchPage: (page) => getSeries({ page, size: PAGE_SIZE }),
  });
  const [selected, setSelected] = useState<SeriesSummary | null>(null);

  if (selected) {
    return <SeriesBooks series={selected} onBack={() => setSelected(null)} />;
  }

  if (!isFetching && series.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Series</Text>
        <Text style={styles.emptyBody}>Series appear here once you add books with series metadata.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={series}
      keyExtractor={(item: SeriesSummary) => item.name}
      refreshControl={<RefreshControl refreshing={isFetching && !isFetchingNextPage} onRefresh={refetch} tintColor={Colors.accent} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => setSelected(item)}>
          <View style={styles.rowMeta}>
            <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.rowCount}>
              {item.readCount}/{item.bookCount} read{item.authors.length > 0 ? ` · ${item.authors.join(', ')}` : ''}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  emptyContainer: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: '700', marginBottom: 12 },
  emptyBody: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  backRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backText: { color: Colors.text, fontSize: 17, fontWeight: '600', marginLeft: 2, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowMeta: { flex: 1, marginRight: 8 },
  rowName: { color: Colors.text, fontSize: 16, fontWeight: '500' },
  rowCount: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  footer: { paddingVertical: 16 },
});
