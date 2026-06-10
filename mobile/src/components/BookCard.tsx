import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { coverHeaders, coverUri } from '@/src/api/client';
import type { BookCard as BookCardType } from '@/src/api/types';
import { Colors } from '@/src/constants/colors';

const FORMAT_COLORS: Record<string, string> = {
  epub: '#2f9e44',
  mobi: '#1971c2',
  azw: '#e8590c',
  azw3: '#e67700',
  cbz: '#7048e8',
  pdf: '#c92a2a',
  mp3: '#0ca678',
  m4b: '#0ca678',
};

interface Props {
  book: BookCardType;
}

export function BookCard({ book }: Props) {
  const primaryFormat = book.files[0]?.format?.toLowerCase() ?? null;
  const formatColor = primaryFormat ? (FORMAT_COLORS[primaryFormat] ?? Colors.accent) : Colors.accent;

  const authorText = book.authors.length > 0 ? book.authors.join(', ') : '';
  const progress = book.readingProgress;

  function handlePress() {
    router.push(`/book/${book.id}`);
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handlePress}
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

      {primaryFormat && (
        <View style={[styles.formatBadge, { backgroundColor: formatColor }]}>
          <Text style={styles.formatText}>{primaryFormat.toUpperCase()}</Text>
        </View>
      )}

      {progress !== null && progress > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%` }]} />
        </View>
      )}

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title ?? 'Unknown Title'}
        </Text>
        {authorText ? (
          <Text style={styles.author} numberOfLines={1}>
            {authorText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 8,
    overflow: 'hidden',
    flex: 1,
    margin: 4,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cover: {
    width: '100%',
    aspectRatio: 2 / 3,
  },
  placeholderCover: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  placeholderText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  formatBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  formatText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: 3,
    backgroundColor: Colors.accent,
  },
  meta: {
    padding: 6,
  },
  title: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  author: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
