import type { BookDetail, BookFileRef } from '@/src/api/types';
import { downloadableFiles, isOpenableEbook, primaryFormat } from '../select';

function file(id: number, format: string, role = 'content', durationSeconds: number | null = null): BookFileRef {
  return { id, format, role, sizeBytes: null, durationSeconds };
}

function book(files: BookFileRef[]): BookDetail {
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
    files,
    audioMetadata: null,
  };
}

describe('downloadableFiles', () => {
  it('returns every audio file for an audiobook', () => {
    const b = book([file(1, 'jpg'), file(2, 'mp3', 'content', 60), file(3, 'm4b', 'content', 120)]);
    expect(downloadableFiles(b).map((f) => f.id)).toEqual([2, 3]);
  });

  it('returns the primary file for an ebook', () => {
    const b = book([file(1, 'pdf', 'supplemental'), file(2, 'epub', 'primary')]);
    expect(downloadableFiles(b).map((f) => f.id)).toEqual([2]);
  });

  it('falls back to the first non-audio file when no primary role exists', () => {
    const b = book([file(1, 'epub', 'content'), file(2, 'pdf', 'content')]);
    expect(downloadableFiles(b).map((f) => f.id)).toEqual([1]);
  });

  it('returns nothing when there are no files', () => {
    expect(downloadableFiles(book([]))).toEqual([]);
  });
});

describe('primaryFormat', () => {
  it('reports the audiobook format', () => {
    expect(primaryFormat(book([file(2, 'm4b', 'content', 60)]))).toBe('m4b');
  });

  it('reports the ebook primary format', () => {
    expect(primaryFormat(book([file(2, 'epub', 'primary')]))).toBe('epub');
  });
});

describe('isOpenableEbook', () => {
  it('accepts known ebook formats case-insensitively', () => {
    expect(isOpenableEbook('EPUB')).toBe(true);
    expect(isOpenableEbook('pdf')).toBe(true);
  });

  it('rejects unknown or null formats', () => {
    expect(isOpenableEbook('m4b')).toBe(false);
    expect(isOpenableEbook(null)).toBe(false);
  });
});
