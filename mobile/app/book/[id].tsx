import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBookDetail } from '@/src/api/books';
import { coverHeaders, coverUri } from '@/src/api/client';
import { Colors } from '@/src/constants/colors';
import { usePlayer } from '@/src/playback/PlayerContext';
import { isAudiobook } from '@/src/playback/queue';

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const bookId = Number(id);
  const player = usePlayer();

  const {
    data: book,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['book', bookId],
    queryFn: () => getBookDetail(bookId),
    enabled: Number.isFinite(bookId),
  });

  const canListen = book != null && isAudiobook(book);

  async function handleListen() {
    if (!book) return;
    await player.loadAndPlay(book.id);
    router.push('/player');
  }

  const goodreadsId = book?.providerIds.goodreads;

  function openGoodreads() {
    if (goodreadsId) {
      Linking.openURL(`https://www.goodreads.com/book/show/${goodreadsId}`);
    }
  }

  const hasDetails =
    book != null &&
    (book.pageCount != null ||
      book.language != null ||
      book.publisher != null ||
      book.publishedYear != null ||
      book.isbn13 != null ||
      book.isbn10 != null ||
      book.rating != null ||
      book.libraryName != null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {book?.title ?? 'Book Details'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      )}

      {isError && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load book details</Text>
          <Pressable style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryText}>Go back</Text>
          </Pressable>
        </View>
      )}

      {book && (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Hero: cover + title block */}
          <View style={styles.heroSection}>
            {book.coverSource ? (
              <Image
                source={{ uri: coverUri(book.id), headers: coverHeaders() }}
                style={styles.cover}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.cover, styles.placeholderCover]}>
                <Text style={styles.placeholderText} numberOfLines={4}>
                  {book.title ?? 'Unknown'}
                </Text>
              </View>
            )}
            <View style={styles.heroInfo}>
              <Text style={styles.title}>{book.title ?? 'Unknown Title'}</Text>
              {book.subtitle && <Text style={styles.subtitle}>{book.subtitle}</Text>}
              {book.authors.length > 0 && <Text style={styles.authors}>{book.authors.map((a) => a.name).join(', ')}</Text>}
              {book.seriesName && (
                <Text style={styles.series}>
                  {book.seriesName}
                  {book.seriesIndex != null ? ` #${book.seriesIndex}` : ''}
                </Text>
              )}
            </View>
          </View>

          {/* Listen (audiobooks only) */}
          {canListen && (
            <View style={styles.listenWrap}>
              <Pressable
                style={({ pressed }) => [styles.listenBtn, pressed && styles.listenBtnPressed]}
                onPress={handleListen}
              >
                <Ionicons name="headset" size={20} color={Colors.bg} />
                <Text style={styles.listenText}>Listen</Text>
              </Pressable>
            </View>
          )}

          {/* Synopsis */}
          {book.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Synopsis</Text>
              <Text style={styles.description}>{book.description}</Text>
            </View>
          )}

          {/* Details */}
          {hasDetails && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailContainer}>
                {book.pageCount != null && <DetailRow label="Pages" value={book.pageCount.toString()} />}
                {book.language && <DetailRow label="Language" value={book.language.toUpperCase()} />}
                {book.publisher && <DetailRow label="Publisher" value={book.publisher} />}
                {book.publishedYear != null && <DetailRow label="Published" value={book.publishedYear.toString()} />}
                {book.isbn13 && <DetailRow label="ISBN-13" value={book.isbn13} />}
                {book.isbn10 && <DetailRow label="ISBN-10" value={book.isbn10} />}
                {book.rating != null && <DetailRow label="Rating" value={`${book.rating.toFixed(1)} ★`} />}
                {book.libraryName && <DetailRow label="Library" value={book.libraryName} />}
              </View>
            </View>
          )}

          {/* Goodreads link */}
          {goodreadsId && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Links</Text>
              <Pressable style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]} onPress={openGoodreads}>
                <Ionicons name="open-outline" size={18} color={Colors.accent} />
                <Text style={styles.linkText}>View on Goodreads</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={styles.linkChevron} />
              </Pressable>
            </View>
          )}

          {/* Genres & Tags */}
          {(book.genres.length > 0 || book.tags.length > 0) && (
            <View style={styles.section}>
              {book.genres.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Genres</Text>
                  <View style={styles.chips}>
                    {book.genres.map((g) => (
                      <View key={g} style={styles.chip}>
                        <Text style={styles.chipText}>{g}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
              {book.tags.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, book.genres.length > 0 && styles.sectionTitleSpaced]}>Tags</Text>
                  <View style={styles.chips}>
                    {book.tags.map((t) => (
                      <View key={t} style={[styles.chip, styles.chipAlt]}>
                        <Text style={styles.chipText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 44, alignItems: 'center', justifyContent: 'center', padding: 8 },
  headerTitle: { flex: 1, color: Colors.text, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: Colors.error, fontSize: 15, textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.surface, borderRadius: 8 },
  retryText: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
  scroll: { paddingBottom: 40 },

  // Hero
  heroSection: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cover: { width: 110, height: 165, borderRadius: 6 },
  placeholderCover: { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', padding: 8 },
  placeholderText: { color: Colors.textSecondary, fontSize: 12, textAlign: 'center' },
  heroInfo: { flex: 1, justifyContent: 'center', gap: 6 },
  title: { color: Colors.text, fontSize: 18, fontWeight: '700', lineHeight: 23 },
  subtitle: { color: Colors.textSecondary, fontSize: 14, lineHeight: 18 },
  authors: { color: Colors.accent, fontSize: 13 },
  series: { color: Colors.textMuted, fontSize: 12, fontStyle: 'italic' },

  // Listen button
  listenWrap: { paddingHorizontal: 20, paddingTop: 20 },
  listenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 13,
    borderRadius: 10,
  },
  listenBtnPressed: { opacity: 0.8 },
  listenText: { color: Colors.bg, fontSize: 15, fontWeight: '700' },

  // Sections
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sectionTitleSpaced: { marginTop: 16 },
  description: { color: Colors.text, fontSize: 14, lineHeight: 21 },

  // Details
  detailContainer: { gap: 0 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: { color: Colors.textMuted, fontSize: 14 },
  detailValue: { color: Colors.text, fontSize: 14, flex: 1, textAlign: 'right', marginLeft: 12 },

  // Links
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
  },
  linkRowPressed: { opacity: 0.6 },
  linkText: { color: Colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  linkChevron: { marginLeft: 'auto' },

  // Chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  chipAlt: { backgroundColor: Colors.border },
  chipText: { color: Colors.textSecondary, fontSize: 12 },

  bottomPad: { height: 24 },
});
