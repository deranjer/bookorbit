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

export interface BookQuery {
  sort: { field: string; dir: 'asc' | 'desc' }[];
  pagination: { page: number; size: number };
  q?: string;
}
