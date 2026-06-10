import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { coverHeaders, coverUri } from '@/src/api/client';
import { searchBooks } from '@/src/api/books';
import { Colors } from '@/src/constants/colors';
import type { SearchResult } from '@/src/api/types';

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function ResultRow({ item }: { item: SearchResult }) {
  const authorText = item.authors.length > 0 ? item.authors.join(', ') : '';

  function handlePress() {
    router.push(`/book/${item.id}`);
  }

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={handlePress}>
      <Image
        style={styles.cover}
        source={{ uri: coverUri(item.id), headers: coverHeaders() }}
        contentFit="cover"
        transition={150}
      />
      <View style={styles.rowMeta}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title ?? 'Unknown Title'}
        </Text>
        {authorText ? (
          <Text style={styles.author} numberOfLines={1}>
            {authorText}
          </Text>
        ) : null}
        {item.seriesName ? (
          <Text style={styles.series} numberOfLines={1}>
            {item.seriesName}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowSide}>
        <Text style={styles.library} numberOfLines={1}>
          {item.libraryName}
        </Text>
        {item.formats.length > 0 ? (
          <View style={styles.formats}>
            {item.formats.map((fmt) => (
              <Text key={fmt} style={styles.formatBadge}>
                {fmt.toUpperCase()}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchBooks(debouncedQuery, 20),
    enabled: debouncedQuery.length > 1,
  });

  const results = data ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        <TextInput
          style={styles.input}
          placeholder="Search books…"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {debouncedQuery.length <= 1 ? (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Type to search your library</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item: SearchResult) => String(item.id)}
          renderItem={({ item }) => <ResultRow item={item} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !isFetching ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No results for &quot;{debouncedQuery}&quot;</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  bar: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  input: {
    backgroundColor: Colors.surface,
    color: Colors.text,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  hint: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hintText: { color: Colors.textMuted, fontSize: 15 },
  list: { paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowPressed: { opacity: 0.6 },
  cover: {
    width: 44,
    height: 66,
    borderRadius: 4,
    backgroundColor: Colors.surface,
  },
  rowMeta: { flex: 1, minWidth: 0 },
  title: { color: Colors.text, fontSize: 14, fontWeight: '600', lineHeight: 18 },
  author: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  series: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  rowSide: { alignItems: 'flex-end', gap: 4, maxWidth: 90 },
  library: { color: Colors.textSecondary, fontSize: 11, fontWeight: '500' },
  formats: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
  formatBadge: {
    color: Colors.accent,
    fontSize: 9,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: Colors.textSecondary, fontSize: 15 },
});
