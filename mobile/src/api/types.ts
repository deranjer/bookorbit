// Local mirrors of @bookorbit/types kept lean to avoid coupling mobile to the pnpm workspace.

export interface AuthUser {
  id: number;
  username: string;
  name: string | null;
  email: string | null;
  active: boolean;
  isSuperuser: boolean;
  isDefaultPassword: boolean;
  avatarUrl: string | null;
  provisioningMethod: string;
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface OidcProviderPublic {
  slug: string;
  displayName: string;
  enabled: boolean;
  iconUrl: string | null;
  clientId: string;
  scopes: string;
}

export interface OidcStateResponse {
  state: string;
  authorizationEndpoint: string;
}

export interface OidcCallbackResponse {
  mode: 'login';
  accessToken: string;
  user: AuthUser;
}

export interface Library {
  id: number;
  name: string;
  icon: string | null;
  displayOrder: number;
  bookCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookFileRef {
  id: number;
  format: string | null;
  role: string;
  sizeBytes: number | null;
  // Present on the book-detail file list (BookDetailDto), absent on lean card refs.
  durationSeconds?: number | null;
  filename?: string | null;
}

export interface AudiobookChapter {
  title: string;
  startMs: number;
}

export interface NarratorRef {
  id: number;
  name: string;
  sortName: string | null;
  displayOrder: number;
}

export interface AudioMetadata {
  narrators: NarratorRef[];
  durationSeconds: number | null;
  abridged: boolean;
  chapters: AudiobookChapter[] | null;
}

export interface BookCard {
  id: number;
  title: string | null;
  authors: string[];
  seriesName: string | null;
  seriesIndex: number | null;
  files: BookFileRef[];
  publishedYear: number | null;
  language: string | null;
  genres: string[];
  rating: number | null;
  readingProgress: number | null;
  addedAt: string;
  hasCover: boolean;
  tags: string[];
  narrators: string[];
}

export interface AudioProgress {
  currentFileId: number;
  positionSeconds: number;
  percentage: number;
}

export type MetadataProviderKey =
  | 'google'
  | 'goodreads'
  | 'amazon'
  | 'hardcover'
  | 'openLibrary'
  | 'itunes'
  | 'audible'
  | 'audnexus'
  | 'comicvine'
  | 'ranobedb'
  | 'kobo';

export type ProviderIds = Partial<Record<MetadataProviderKey, string | null>>;

export interface BookAuthorRef {
  id: number;
  name: string;
  sortName: string | null;
}

export type ReadStatusSource = 'auto' | 'manual';

export interface UserBookStatus {
  status: ReadStatus;
  source: ReadStatusSource;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
}

// Lean mirror of @bookorbit/types BookRecommendation / SeriesBookRecommendation.
// Returned by the recommendation, author-books, and series-books endpoints.
export interface BookRecommendation {
  id: number;
  title: string | null;
  hasCover: boolean;
  authors: string[];
  seriesIndex?: number | null;
  isAudiobook?: boolean;
}

// Mirrors the populated subset of the server BookDetailDto that the details page renders.
export interface BookDetail {
  id: number;
  libraryId: number;
  libraryName: string;
  status: string;
  addedAt: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  isbn10: string | null;
  isbn13: string | null;
  publisher: string | null;
  publishedYear: number | null;
  language: string | null;
  pageCount: number | null;
  seriesId: number | null;
  seriesName: string | null;
  seriesIndex: number | null;
  rating: number | null;
  coverSource: 'extracted' | 'custom' | null;
  providerIds: ProviderIds;
  authors: BookAuthorRef[];
  genres: string[];
  tags: string[];
  files: BookFileRef[];
  readStatus: UserBookStatus | null;
  collections: { id: number; name: string }[];
  audioMetadata: AudioMetadata | null;
}

// The /books/search endpoint returns a lean cross-library shape, NOT a full BookCard.
export interface SearchResult {
  id: number;
  title: string | null;
  seriesName: string | null;
  authors: string[];
  libraryId: number;
  libraryName: string;
  formats: string[];
}

export interface BooksPage {
  items: BookCard[];
  total: number;
  page: number;
  size: number;
}

export interface SmartScope {
  id: number;
  name: string;
  icon: string | null;
  isPublic: boolean;
  displayOrder: number;
  bookCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Collection {
  id: number;
  name: string;
  icon: string | null;
  displayOrder: number;
  bookCount?: number;
  createdAt: string;
  updatedAt: string;
}

// `GET /collections?bookIds=` augments each collection with a membership count:
// memberCount > 0 means at least one of the queried books is in the collection.
export interface CollectionWithMembership extends Collection {
  memberCount: number;
}

export interface AuthorSummary {
  id: number;
  name: string;
  sortName: string | null;
  imageUrl?: string | null;
  bookCount: number;
  lastAddedAt: string | null;
}

export interface AuthorsPage {
  items: AuthorSummary[];
  total: number;
  page: number;
  size: number;
}

export interface SeriesSummary {
  name: string;
  bookCount: number;
  readCount: number;
  authors: string[];
  coverBookIds: number[];
  lastAddedAt: string | null;
}

export interface SeriesPage {
  items: SeriesSummary[];
  total: number;
  page: number;
  size: number;
}

export interface SeriesBooksPage extends BooksPage {
  seriesInfo: {
    name: string;
    bookCount: number;
    readCount: number;
    authors: string[];
    possibleGaps: number[];
  };
}

export type ScrollerType = 'recently-added' | 'continue-reading' | 'random' | 'smart-scope';

export interface SetupStatus {
  needsSetup: boolean;
}

// Lean mirrors of @bookorbit/types query shapes. Mobile only uses the curated
// subset of fields/operators the Filter & Sort sheet can emit, but the wire
// types stay loose (string) so we never block on porting the full union.
export type ReadStatus =
  | 'unread'
  | 'want_to_read'
  | 'reading'
  | 'on_hold'
  | 'rereading'
  | 'read'
  | 'skimmed'
  | 'abandoned';

export type SortField =
  | 'title'
  | 'author'
  | 'series'
  | 'seriesIndex'
  | 'addedAt'
  | 'updatedAt'
  | 'publishedYear'
  | 'pageCount'
  | 'rating'
  | 'readProgress'
  | 'readStatus'
  | 'lastReadAt'
  | 'random';

export type RuleField =
  | 'readStatus'
  | 'readProgress'
  | 'format'
  | 'fileAvailability'
  | 'author'
  | 'genre'
  | 'tag'
  | 'language'
  | 'rating'
  | 'publishedYear';

export type RuleOperator =
  | 'includesAny'
  | 'gte'
  | 'lte'
  | 'between'
  | 'isUnread'
  | 'isInProgress'
  | 'isFinished'
  | 'isPresent'
  | 'isMissing';

export interface Rule {
  type: 'rule';
  field: RuleField;
  operator: RuleOperator;
  value?: string | number | string[] | number[];
  valueTo?: string | number;
}

export interface GroupRule {
  type: 'group';
  join: 'AND' | 'OR';
  rules: (Rule | GroupRule)[];
}

export interface SortSpec {
  field: SortField;
  dir: 'asc' | 'desc';
}

export interface BookQuery {
  sort: SortSpec[];
  pagination: { page: number; size: number };
  filter?: GroupRule;
  q?: string;
}
