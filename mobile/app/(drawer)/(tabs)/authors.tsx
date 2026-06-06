import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { BookCard } from '@/src/components/BookCard';
import { getAuthors, getAuthorBooks } from '@/src/api/authors';
import { authorThumbUri, coverHeaders } from '@/src/api/client';
import { Colors } from '@/src/constants/colors';
import type { AuthorSummary, BookCard as BookCardType } from '@/src/api/types';

const NUM_COLUMNS = 3;

function AuthorBooks({ author, onBack }: { author: AuthorSummary; onBack: () => void }) {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ['authorBooks', author.id],
    queryFn: () => getAuthorBooks(author.id, { size: 100 }),
  });
  const books = data?.items ?? [];

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.backRow} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={Colors.accent} />
        <Text style={styles.backText} numberOfLines={1}>{author.name}</Text>
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
              <Text style={styles.emptyText}>No books for this author.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

export default function AuthorsScreen() {
  const { data, refetch, isFetching } = useQuery({ queryKey: ['authors'], queryFn: () => getAuthors({ size: 100 }) });
  const [selected, setSelected] = useState<AuthorSummary | null>(null);

  if (selected) {
    return <AuthorBooks author={selected} onBack={() => setSelected(null)} />;
  }

  const authors = data?.items ?? [];

  if (!isFetching && authors.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Authors</Text>
        <Text style={styles.emptyBody}>Authors appear here once you add books with author metadata.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={authors}
      keyExtractor={(item: AuthorSummary) => String(item.id)}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Colors.accent} />}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => setSelected(item)}>
          {item.imageUrl ? (
            <Image style={styles.avatar} source={{ uri: authorThumbUri(item.id), headers: coverHeaders() }} contentFit="cover" transition={150} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.rowMeta}>
            <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.rowCount}>{item.bookCount} {item.bookCount === 1 ? 'book' : 'books'}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: Colors.textSecondary, fontSize: 18, fontWeight: '700' },
  rowMeta: { flex: 1, marginLeft: 12 },
  rowName: { color: Colors.text, fontSize: 16, fontWeight: '500' },
  rowCount: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  grid: { padding: 4 },
  cell: { flex: 1 / NUM_COLUMNS },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.textSecondary, fontSize: 15 },
});
