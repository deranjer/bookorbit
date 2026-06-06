import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { BookCard } from '@/src/components/BookCard';
import { getSeries, getSeriesBooks } from '@/src/api/series';
import { Colors } from '@/src/constants/colors';
import type { BookCard as BookCardType, SeriesSummary } from '@/src/api/types';

const NUM_COLUMNS = 3;

function SeriesBooks({ series, onBack }: { series: SeriesSummary; onBack: () => void }) {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['seriesBooks', series.name],
    queryFn: () => getSeriesBooks(series.name, { size: 100 }),
  });
  const books = data?.items ?? [];

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backRow} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={Colors.accent} />
        <Text style={styles.backText} numberOfLines={1}>{series.name}</Text>
      </Pressable>
      <FlatList
        data={books}
        numColumns={NUM_COLUMNS}
        keyExtractor={(item: BookCardType) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <BookCard book={item} />
          </View>
        )}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent} />}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          !isFetching ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No books in this series.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

export default function SeriesScreen() {
  const { data, refetch, isFetching } = useQuery({ queryKey: ['series'], queryFn: () => getSeries({ size: 100 }) });
  const [selected, setSelected] = useState<SeriesSummary | null>(null);

  if (selected) {
    return <SeriesBooks series={selected} onBack={() => setSelected(null)} />;
  }

  const series = data?.items ?? [];

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
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent} />}
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
  grid: { padding: 4 },
  cell: { flex: 1 / NUM_COLUMNS },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.textSecondary, fontSize: 15 },
});
