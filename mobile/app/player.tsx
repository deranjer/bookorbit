import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveTrack, useProgress } from 'react-native-track-player';
import { coverHeaders, coverUri } from '@/src/api/client';
import { Colors } from '@/src/constants/colors';
import { usePlayer } from '@/src/playback/PlayerContext';
import { SPEED_PRESETS } from '@/src/playback/constants';
import { currentChapterIndex, performerLabel, toAbsoluteSec } from '@/src/playback/queue';

function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const mm = minutes.toString().padStart(hours > 0 ? 2 : 1, '0');
  const ss = seconds.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const {
    currentBook,
    files,
    chapters,
    totalDuration,
    isPlaying,
    isBuffering,
    speed,
    skipBackSeconds,
    skipForwardSeconds,
    togglePlay,
    skipBack,
    skipForward,
    seekToAbsolute,
    setSpeed,
  } = usePlayer();

  const progress = useProgress(250);
  const activeTrack = useActiveTrack();
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const [showChapters, setShowChapters] = useState(false);

  const currentIndex = useMemo(
    () => (activeTrack ? files.findIndex((f) => String(f.id) === activeTrack.id) : 0),
    [activeTrack, files],
  );

  const absolutePosition = toAbsoluteSec(files, Math.max(0, currentIndex), progress.position);
  const displayPosition = scrubbing ?? absolutePosition;
  const remaining = Math.max(0, totalDuration - displayPosition);

  const chapterIdx = currentChapterIndex(chapters, displayPosition);
  const currentChapterTitle = chapterIdx >= 0 ? chapters[chapterIdx]!.title : null;

  function prevChapter() {
    if (chapters.length === 0) return;
    const idx = currentChapterIndex(chapters, absolutePosition);
    // If more than 3s into the current chapter, restart it; otherwise go back one.
    const atStart = idx >= 0 && absolutePosition - chapters[idx]!.startSec < 3;
    const target = atStart && idx > 0 ? chapters[idx - 1]! : chapters[Math.max(0, idx)]!;
    void seekToAbsolute(target.startSec);
  }

  function nextChapter() {
    if (chapters.length === 0) return;
    const idx = currentChapterIndex(chapters, absolutePosition);
    const next = chapters[idx + 1];
    if (next) void seekToAbsolute(next.startSec);
  }

  if (!currentBook) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.muted}>Nothing playing</Text>
        <Pressable style={styles.closeFallback} onPress={() => router.back()}>
          <Text style={styles.linkText}>Close</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={26} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerLabel}>Now Playing</Text>
        <Pressable
          onPress={() => setShowChapters((v) => !v)}
          hitSlop={8}
          style={[styles.headerBtn, chapters.length === 0 && styles.disabled]}
          disabled={chapters.length === 0}
        >
          <Ionicons name="list" size={24} color={Colors.text} />
        </Pressable>
      </View>

      {showChapters ? (
        <ScrollView style={styles.chapterList} contentContainerStyle={styles.chapterListContent}>
          {chapters.map((c, i) => (
            <Pressable
              key={`${c.startSec}-${i}`}
              style={[styles.chapterRow, i === chapterIdx && styles.chapterRowActive]}
              onPress={() => {
                void seekToAbsolute(c.startSec);
                setShowChapters(false);
              }}
            >
              <Text style={[styles.chapterTitle, i === chapterIdx && styles.chapterTitleActive]} numberOfLines={1}>
                {c.title}
              </Text>
              <Text style={styles.chapterTime}>{formatTime(c.startSec)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.main}>
          <View style={styles.artWrap}>
            {currentBook.coverSource ? (
              <Image
                source={{ uri: coverUri(currentBook.id), headers: coverHeaders() }}
                style={styles.art}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.art, styles.artPlaceholder]}>
                <Ionicons name="musical-notes" size={64} color={Colors.textMuted} />
              </View>
            )}
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {currentBook.title ?? 'Audiobook'}
          </Text>
          <Text style={styles.performer} numberOfLines={1}>
            {performerLabel(currentBook)}
          </Text>
          {currentChapterTitle ? (
            <Text style={styles.chapterNow} numberOfLines={1}>
              {currentChapterTitle}
            </Text>
          ) : null}
        </View>
      )}

      {/* Scrubber */}
      <View style={styles.scrubBlock}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={totalDuration || 1}
          value={displayPosition}
          minimumTrackTintColor={Colors.accent}
          maximumTrackTintColor={Colors.border}
          thumbTintColor={Colors.accent}
          onValueChange={setScrubbing}
          onSlidingComplete={(v) => {
            setScrubbing(null);
            void seekToAbsolute(v);
          }}
        />
        <View style={styles.times}>
          <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
          <Text style={styles.timeText}>-{formatTime(remaining)}</Text>
        </View>
      </View>

      {/* Transport controls */}
      <View style={styles.controls}>
        <Pressable onPress={prevChapter} hitSlop={8} style={[styles.ctrlBtn, chapters.length === 0 && styles.disabled]} disabled={chapters.length === 0}>
          <Ionicons name="play-skip-back" size={26} color={Colors.text} />
        </Pressable>

        <Pressable onPress={skipBack} hitSlop={8} style={styles.skipBtn}>
          <Ionicons name="play-back" size={28} color={Colors.text} />
          <Text style={styles.skipLabel}>{skipBackSeconds}</Text>
        </Pressable>

        <Pressable onPress={togglePlay} style={styles.playBtn}>
          {isBuffering ? (
            <ActivityIndicator size="small" color={Colors.bg} />
          ) : (
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={38} color={Colors.bg} />
          )}
        </Pressable>

        <Pressable onPress={skipForward} hitSlop={8} style={styles.skipBtn}>
          <Ionicons name="play-forward" size={28} color={Colors.text} />
          <Text style={styles.skipLabel}>{skipForwardSeconds}</Text>
        </Pressable>

        <Pressable onPress={nextChapter} hitSlop={8} style={[styles.ctrlBtn, chapters.length === 0 && styles.disabled]} disabled={chapters.length === 0}>
          <Ionicons name="play-skip-forward" size={26} color={Colors.text} />
        </Pressable>
      </View>

      {/* Speed presets */}
      <View style={styles.speedRow}>
        {SPEED_PRESETS.map((preset) => (
          <Pressable
            key={preset}
            onPress={() => void setSpeed(preset)}
            style={[styles.speedChip, Math.abs(preset - speed) < 0.001 && styles.speedChipActive]}
          >
            <Text style={[styles.speedText, Math.abs(preset - speed) < 0.001 && styles.speedTextActive]}>{preset}x</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 20 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  muted: { color: Colors.textSecondary, fontSize: 15 },
  closeFallback: { marginTop: 16 },
  linkText: { color: Colors.accent, fontSize: 15, fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  disabled: { opacity: 0.3 },

  main: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  artWrap: { width: '78%', aspectRatio: 1, marginBottom: 28, borderRadius: 12, overflow: 'hidden', backgroundColor: Colors.surface },
  art: { width: '100%', height: '100%' },
  artPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  performer: { color: Colors.accent, fontSize: 14, marginTop: 6, textAlign: 'center' },
  chapterNow: { color: Colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center' },

  chapterList: { flex: 1, marginTop: 8 },
  chapterListContent: { paddingBottom: 12 },
  chapterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 },
  chapterRowActive: {},
  chapterTitle: { color: Colors.text, fontSize: 14, flex: 1 },
  chapterTitleActive: { color: Colors.accent, fontWeight: '700' },
  chapterTime: { color: Colors.textMuted, fontSize: 12 },

  scrubBlock: { marginTop: 8 },
  slider: { width: '100%', height: 36 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  timeText: { color: Colors.textSecondary, fontSize: 12 },

  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingHorizontal: 4 },
  ctrlBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  skipBtn: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  skipLabel: { color: Colors.text, fontSize: 10, fontWeight: '700', marginTop: 2 },
  playBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.text, alignItems: 'center', justifyContent: 'center' },

  speedRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 22 },
  speedChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: Colors.surface },
  speedChipActive: { backgroundColor: Colors.accent },
  speedText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  speedTextActive: { color: Colors.bg },
});
