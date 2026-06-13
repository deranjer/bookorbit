import { useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { Colors } from '@/src/constants/colors';
import { useDownloads, type ActiveDownload } from '@/src/downloads/DownloadsContext';
import { formatBytes } from '@/src/downloads/format';
import { isOpenableEbook } from '@/src/downloads/select';
import type { DownloadedBook } from '@/src/downloads/types';
import { usePlayer } from '@/src/playback/PlayerContext';

interface ActiveRow {
  bookId: number;
  active: ActiveDownload;
}

export default function DownloadsScreen() {
  const { downloads, active, removeDownload } = useDownloads();
  const player = usePlayer();

  const activeRows = useMemo<ActiveRow[]>(
    () =>
      Object.entries(active)
        .map(([bookId, a]) => ({ bookId: Number(bookId), active: a }))
        .filter((r) => !downloads.some((d) => d.bookId === r.bookId)),
    [active, downloads],
  );

  async function openBook(item: DownloadedBook) {
    if (item.isAudiobook) {
      await player.loadAndPlay(item.bookId);
      router.push('/player');
      return;
    }
    const file = item.files[0];
    if (!file) return;
    if (!isOpenableEbook(item.format) || !(await Sharing.isAvailableAsync())) {
      Alert.alert('Cannot open', 'No app is available to open this file on your device.');
      return;
    }
    await Sharing.shareAsync(file.localUri).catch(() => {});
  }

  function confirmDelete(item: DownloadedBook) {
    Alert.alert('Delete download', `Remove "${item.title ?? 'this book'}" from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            // Stop playback first if we're deleting the file that's playing.
            if (player.currentBook?.id === item.bookId) await player.stop();
            await removeDownload(item.bookId);
          })();
        },
      },
    ]);
  }

  if (downloads.length === 0 && activeRows.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cloud-download-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No Downloads</Text>
        <Text style={styles.emptyBody}>
          Download a book or audiobook from its details page to read or listen offline.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={downloads}
      keyExtractor={(item) => String(item.bookId)}
      ListHeaderComponent={
        activeRows.length > 0 ? (
          <View>
            {activeRows.map((row) => (
              <View key={row.bookId} style={styles.row}>
                <View style={[styles.cover, styles.coverPlaceholder]}>
                  <Ionicons name="cloud-download-outline" size={20} color={Colors.textSecondary} />
                </View>
                <View style={styles.meta}>
                  <Text style={styles.title} numberOfLines={1}>
                    {row.active.title ?? 'Downloading…'}
                  </Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(row.active.fraction * 100)}%` }]} />
                  </View>
                </View>
                <Text style={styles.percent}>{Math.round(row.active.fraction * 100)}%</Text>
              </View>
            ))}
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => openBook(item)}>
          {item.coverLocalUri ? (
            <Image style={styles.cover} source={{ uri: item.coverLocalUri }} contentFit="cover" transition={150} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name={item.isAudiobook ? 'musical-notes' : 'book'} size={20} color={Colors.textSecondary} />
            </View>
          )}
          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title ?? 'Untitled'}
            </Text>
            {item.authors.length > 0 && (
              <Text style={styles.authors} numberOfLines={1}>
                {item.authors.join(', ')}
              </Text>
            )}
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Ionicons
                  name={item.isAudiobook ? 'headset' : 'document-text-outline'}
                  size={11}
                  color={Colors.textSecondary}
                />
                <Text style={styles.badgeText}>
                  {item.isAudiobook ? 'Audiobook' : (item.format?.toUpperCase() ?? 'Book')}
                </Text>
              </View>
              <Text style={styles.size}>{formatBytes(item.sizeBytes)}</Text>
            </View>
          </View>
          <Pressable onPress={() => confirmDelete(item)} hitSlop={10} style={styles.trash}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
          </Pressable>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  emptyContainer: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  emptyBody: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cover: { width: 48, height: 64, borderRadius: 4, backgroundColor: Colors.surface },
  coverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  meta: { flex: 1, marginLeft: 12, gap: 3 },
  title: { color: Colors.text, fontSize: 15, fontWeight: '600' },
  authors: { color: Colors.textSecondary, fontSize: 13 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10 },
  badgeText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },
  size: { color: Colors.textMuted, fontSize: 12 },
  trash: { padding: 8, marginLeft: 4 },
  percent: { color: Colors.accent, fontSize: 13, fontWeight: '600', marginLeft: 8, width: 40, textAlign: 'right' },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: Colors.border, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: Colors.accent },
});
