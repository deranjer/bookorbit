import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { BookCard } from './BookCard';
import { Colors } from '@/src/constants/colors';
import type { BookCard as BookCardType } from '@/src/api/types';

const NUM_COLUMNS = 3;

interface Props {
  books: BookCardType[];
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
  isLoading?: boolean;
  emptyText: string;
}

// Shared 3-column book grid with pull-to-refresh and infinite scroll.
export function BookGrid({ books, refreshing, onRefresh, onEndReached, loadingMore = false, isLoading = false, emptyText }: Props) {
  return (
    <FlatList
      data={books}
      numColumns={NUM_COLUMNS}
      keyExtractor={(item: BookCardType) => String(item.id)}
      renderItem={({ item }) => (
        <View style={styles.cell}>
          <BookCard book={item} />
        </View>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      contentContainerStyle={styles.grid}
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        ) : null
      }
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  grid: { padding: 4 },
  cell: { flex: 1 / NUM_COLUMNS },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.textSecondary, fontSize: 15 },
  footer: { paddingVertical: 16 },
});
