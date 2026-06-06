import { useCallback } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { BookCard } from '@/src/components/BookCard';
import { getScroller } from '@/src/api/dashboard';
import { Colors } from '@/src/constants/colors';
import type { BookCard as BookCardType } from '@/src/api/types';

function ScrollerSection({ title, type }: { title: string; type: 'continue-reading' | 'recently-added' }) {
  const { data } = useQuery({
    queryKey: ['scroller', type],
    queryFn: () => getScroller(type, { limit: 20 }),
  });

  if (!data || data.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        horizontal
        data={data}
        keyExtractor={(item: BookCardType) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <BookCard book={item} />
          </View>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      />
    </View>
  );
}

export default function DashboardScreen() {
  const { refetch: refetchContinue, isFetching: fetchingContinue } = useQuery({
    queryKey: ['scroller', 'continue-reading'],
    queryFn: () => getScroller('continue-reading', { limit: 20 }),
  });
  const { refetch: refetchRecent, isFetching: fetchingRecent } = useQuery({
    queryKey: ['scroller', 'recently-added'],
    queryFn: () => getScroller('recently-added', { limit: 20 }),
  });

  const onRefresh = useCallback(async () => {
    await Promise.all([refetchContinue(), refetchRecent()]);
  }, [refetchContinue, refetchRecent]);

  const isRefreshing = fetchingContinue || fetchingRecent;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      <ScrollerSection title="Continue Reading" type="continue-reading" />
      <ScrollerSection title="Recently Added" type="recently-added" />
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  section: { marginTop: 8 },
  sectionTitle: { color: Colors.text, fontSize: 17, fontWeight: '600', marginHorizontal: 16, marginBottom: 10 },
  horizontalList: { paddingHorizontal: 12 },
  cardWrapper: { width: 130, marginHorizontal: 4 },
  bottomPad: { height: 24 },
});
