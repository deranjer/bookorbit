import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { coverHeaders, coverUri } from '@/src/api/client';
import type { BookRecommendation } from '@/src/api/types';
import { Colors } from '@/src/constants/colors';

interface Props {
  title: string;
  books: BookRecommendation[];
}

function RecommendationCard({ book }: { book: BookRecommendation }) {
  const authorText = book.authors.length > 0 ? book.authors.join(', ') : '';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/book/${book.id}`)}
    >
      {book.hasCover ? (
        <Image
          style={styles.cover}
          source={{ uri: coverUri(book.id), headers: coverHeaders() }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.cover, styles.placeholderCover]}>
          <Text style={styles.placeholderText} numberOfLines={3}>
            {book.title ?? 'Unknown'}
          </Text>
        </View>
      )}
      {book.isAudiobook && (
        <View style={styles.audioBadge}>
          <Ionicons name="headset" size={11} color="#fff" />
        </View>
      )}
      <Text style={styles.title} numberOfLines={2}>
        {book.title ?? 'Unknown Title'}
      </Text>
      {authorText ? (
        <Text style={styles.author} numberOfLines={1}>
          {authorText}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function RecommendationScroller({ title, books }: Props) {
  if (books.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <FlatList
        horizontal
        data={books}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <RecommendationCard book={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 24 },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  list: { paddingHorizontal: 16, gap: 12 },
  card: { width: 104 },
  cardPressed: { opacity: 0.7 },
  cover: { width: 104, height: 156, borderRadius: 6, backgroundColor: Colors.surface },
  placeholderCover: { alignItems: 'center', justifyContent: 'center', padding: 6 },
  placeholderText: { color: Colors.textSecondary, fontSize: 11, textAlign: 'center' },
  audioBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  title: { color: Colors.text, fontSize: 12, fontWeight: '600', lineHeight: 16, marginTop: 6 },
  author: { color: Colors.textSecondary, fontSize: 11, marginTop: 2 },
});
