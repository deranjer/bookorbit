import type { ReadStatus, SortField } from '@/src/api/types';

// Curated, mobile-friendly view of the server's filter model. Each property maps
// to one rule under a single top-level AND group (see buildBookQuery).
export interface LibraryFilters {
  readStatus: ReadStatus[];
  readProgress: 'unread' | 'inProgress' | 'finished' | null;
  formats: string[];
  fileAvailability: 'present' | 'missing' | null;
  authors: string[];
  genres: string[];
  tags: string[];
  languages: string[];
  minRating: number | null;
  yearFrom: number | null;
  yearTo: number | null;
}

export interface LibrarySort {
  field: SortField;
  dir: 'asc' | 'desc';
}

export const DEFAULT_FILTERS: LibraryFilters = {
  readStatus: [],
  readProgress: null,
  formats: [],
  fileAvailability: null,
  authors: [],
  genres: [],
  tags: [],
  languages: [],
  minRating: null,
  yearFrom: null,
  yearTo: null,
};

export const DEFAULT_SORT: LibrarySort = { field: 'title', dir: 'asc' };

export const READ_STATUS_OPTIONS: { value: ReadStatus; label: string }[] = [
  { value: 'unread', label: 'Unread' },
  { value: 'want_to_read', label: 'Want to Read' },
  { value: 'reading', label: 'Reading' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'rereading', label: 'Rereading' },
  { value: 'read', label: 'Read' },
  { value: 'skimmed', label: 'Skimmed' },
  { value: 'abandoned', label: 'Abandoned' },
];

export const READ_PROGRESS_OPTIONS: { value: NonNullable<LibraryFilters['readProgress']>; label: string }[] = [
  { value: 'unread', label: 'Unread' },
  { value: 'inProgress', label: 'In Progress' },
  { value: 'finished', label: 'Finished' },
];

export const FILE_AVAILABILITY_OPTIONS: { value: NonNullable<LibraryFilters['fileAvailability']>; label: string }[] = [
  { value: 'present', label: 'Present' },
  { value: 'missing', label: 'Missing' },
];

// Matches the formats the server accepts for the `format` filter field.
export const FORMAT_OPTIONS: string[] = [
  'epub',
  'pdf',
  'mobi',
  'azw3',
  'cbz',
  'cbr',
  'fb2',
  'm4b',
  'mp3',
  'm4a',
  'opus',
  'ogg',
  'flac',
];

// Single-field sort options exposed on mobile (a basic subset of the web's set).
export const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'title', label: 'Title' },
  { field: 'author', label: 'Author' },
  { field: 'addedAt', label: 'Date Added' },
  { field: 'updatedAt', label: 'Date Updated' },
  { field: 'publishedYear', label: 'Published Year' },
  { field: 'rating', label: 'Rating' },
  { field: 'series', label: 'Series' },
  { field: 'pageCount', label: 'Page Count' },
  { field: 'readStatus', label: 'Read Status' },
  { field: 'readProgress', label: 'Read Progress' },
  { field: 'lastReadAt', label: 'Last Read' },
  { field: 'random', label: 'Random' },
];
