import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { coverHeaders, coverUri } from '@/src/api/client';
import { Colors } from '@/src/constants/colors';
import { usePlayer } from '@/src/playback/PlayerContext';
import { performerLabel } from '@/src/playback/queue';

/**
 * Persistent now-playing bar docked above the bottom tab bar. Tap to expand to the
 * full-screen player. Hidden when no audiobook is loaded.
 */
export function MiniPlayer() {
  const { currentBook, isActive, isPlaying, isBuffering, togglePlay } = usePlayer();

  if (!isActive || !currentBook) return null;

  return (
    <Pressable style={styles.bar} onPress={() => router.push('/player')}>
      {currentBook.coverSource ? (
        <Image
          source={{ uri: coverUri(currentBook.id), headers: coverHeaders() }}
          style={styles.cover}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="musical-notes" size={18} color={Colors.textSecondary} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {currentBook.title ?? 'Audiobook'}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {performerLabel(currentBook)}
        </Text>
      </View>

      <Pressable onPress={togglePlay} hitSlop={10} style={styles.playBtn}>
        {isBuffering ? (
          <ActivityIndicator size="small" color={Colors.text} />
        ) : (
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={26} color={Colors.text} />
        )}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cover: { width: 40, height: 40, borderRadius: 4 },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.cardBg },
  info: { flex: 1, justifyContent: 'center' },
  title: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  subtitle: { color: Colors.textSecondary, fontSize: 12, marginTop: 1 },
  playBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
