import type { BookDetail, BookFileRef } from '@/src/api/types';
import {
  audioFiles,
  buildTracks,
  currentChapterIndex,
  isAudiobook,
  locateAbsolute,
  percentageFor,
  performerLabel,
  resolveChapters,
  toAbsoluteSec,
  totalDurationSec,
} from '../queue';

function file(id: number, format: string, durationSeconds: number | null, role = 'content'): BookFileRef {
  return { id, format, role, sizeBytes: null, durationSeconds };
}

function book(overrides: Partial<BookDetail> = {}): BookDetail {
  return {
    id: 7,
    libraryId: 1,
    libraryName: 'Lib',
    status: 'ready',
    addedAt: '',
    title: 'My Book',
    subtitle: null,
    description: null,
    isbn10: null,
    isbn13: null,
    publisher: null,
    publishedYear: null,
    language: null,
    pageCount: null,
    seriesId: null,
    seriesName: null,
    seriesIndex: null,
    rating: null,
    coverSource: null,
    providerIds: {},
    authors: [{ id: 1, name: 'Author One', sortName: null }],
    genres: [],
    tags: [],
    files: [],
    audioMetadata: null,
    ...overrides,
  };
}

describe('audioFiles / isAudiobook', () => {
  it('keeps only audio-format files and preserves order', () => {
    const b = book({
      files: [file(1, 'epub', null), file(2, 'mp3', 60), file(3, 'jpg', null), file(4, 'm4b', 120)],
    });
    expect(audioFiles(b).map((f) => f.id)).toEqual([2, 4]);
    expect(isAudiobook(b)).toBe(true);
  });

  it('reports non-audio books as not audiobooks', () => {
    expect(isAudiobook(book({ files: [file(1, 'epub', null)] }))).toBe(false);
  });
});

describe('performerLabel', () => {
  it('prefers narrators over authors', () => {
    const b = book({
      audioMetadata: {
        narrators: [
          { id: 1, name: 'Narrator A', sortName: null, displayOrder: 0 },
          { id: 2, name: 'Narrator B', sortName: null, displayOrder: 1 },
        ],
        durationSeconds: null,
        abridged: false,
        chapters: null,
      },
    });
    expect(performerLabel(b)).toBe('Narrator A, Narrator B');
  });

  it('falls back to authors when no narrators', () => {
    expect(performerLabel(book())).toBe('Author One');
  });
});

describe('buildTracks', () => {
  it('builds stream URLs with auth headers and metadata', () => {
    const b = book({ files: [file(2, 'mp3', 60), file(4, 'm4b', 120)] });
    const tracks = buildTracks(b, { baseUrl: 'http://host:3000', token: 'tok' });
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({
      id: '2',
      url: 'http://host:3000/api/v1/books/files/2/serve',
      headers: { Authorization: 'Bearer tok' },
      title: 'My Book',
      artist: 'Author One',
      duration: 60,
    });
  });

  it('omits headers when there is no token', () => {
    const b = book({ files: [file(2, 'mp3', 60)] });
    const [track] = buildTracks(b, { baseUrl: 'http://host', token: null });
    expect(track!.headers).toBeUndefined();
  });

  it('uses local file uris (no auth header) and attaches artwork when downloaded', () => {
    const b = book({ files: [file(2, 'mp3', 60), file(4, 'm4b', 120)] });
    const tracks = buildTracks(b, {
      baseUrl: 'http://host',
      token: 'tok',
      localFiles: new Map([[2, 'file:///downloads/7/2.mp3']]),
      artwork: 'file:///downloads/7/cover.jpg',
    });
    // File 2 is downloaded: local uri, no headers, artwork attached.
    expect(tracks[0]).toMatchObject({
      url: 'file:///downloads/7/2.mp3',
      artwork: 'file:///downloads/7/cover.jpg',
    });
    expect(tracks[0]!.headers).toBeUndefined();
    // File 4 is not in the local map: falls back to streaming with auth headers, no artwork.
    expect(tracks[1]).toMatchObject({
      url: 'http://host/api/v1/books/files/4/serve',
      headers: { Authorization: 'Bearer tok' },
    });
    expect(tracks[1]!.artwork).toBeUndefined();
  });
});

describe('whole-book offset math', () => {
  const files = [file(1, 'mp3', 100), file(2, 'mp3', 200), file(3, 'mp3', 50)];

  it('sums total duration', () => {
    expect(totalDurationSec(files)).toBe(350);
  });

  it('converts file/offset to absolute seconds', () => {
    expect(toAbsoluteSec(files, 0, 30)).toBe(30);
    expect(toAbsoluteSec(files, 1, 30)).toBe(130);
    expect(toAbsoluteSec(files, 2, 10)).toBe(310);
  });

  it('locates an absolute offset within the right file', () => {
    expect(locateAbsolute(files, 30)).toEqual({ index: 0, offsetSec: 30 });
    expect(locateAbsolute(files, 130)).toEqual({ index: 1, offsetSec: 30 });
    expect(locateAbsolute(files, 310)).toEqual({ index: 2, offsetSec: 10 });
  });

  it('clamps past-the-end offsets into the last file', () => {
    expect(locateAbsolute(files, 999)).toEqual({ index: 2, offsetSec: 699 });
  });

  it('round-trips toAbsolute <-> locateAbsolute', () => {
    const loc = locateAbsolute(files, 250);
    expect(toAbsoluteSec(files, loc.index, loc.offsetSec)).toBe(250);
  });

  it('computes percentage across the whole book', () => {
    expect(percentageFor(files, 1, 75)).toBeCloseTo((175 / 350) * 100, 5);
    expect(percentageFor([], 0, 0)).toBe(0);
  });
});

describe('chapters', () => {
  it('converts startMs to seconds and sorts', () => {
    const resolved = resolveChapters([
      { title: 'Two', startMs: 60_000 },
      { title: 'One', startMs: 0 },
    ]);
    expect(resolved).toEqual([
      { title: 'One', startSec: 0 },
      { title: 'Two', startSec: 60 },
    ]);
  });

  it('returns empty for missing chapters', () => {
    expect(resolveChapters(null)).toEqual([]);
    expect(resolveChapters(undefined)).toEqual([]);
  });

  it('finds the current chapter by absolute position', () => {
    const chapters = resolveChapters([
      { title: 'A', startMs: 0 },
      { title: 'B', startMs: 60_000 },
      { title: 'C', startMs: 120_000 },
    ]);
    expect(currentChapterIndex(chapters, 0)).toBe(0);
    expect(currentChapterIndex(chapters, 59)).toBe(0);
    expect(currentChapterIndex(chapters, 60)).toBe(1);
    expect(currentChapterIndex(chapters, 130)).toBe(2);
    expect(currentChapterIndex([], 10)).toBe(-1);
  });
});
