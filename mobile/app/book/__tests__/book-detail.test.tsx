import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import BookDetailScreen from '../[id]';
import { getBookDetail } from '@/src/api/books';
import type { BookDetail } from '@/src/api/types';

jest.mock('@/src/api/books');
jest.mock('@expo/vector-icons', () => ({ Ionicons: '' }));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ id: '1' }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/src/playback/PlayerContext', () => ({
  usePlayer: () => ({ loadAndPlay: jest.fn() }),
}));

const mockGetBookDetail = getBookDetail as jest.MockedFunction<typeof getBookDetail>;

function makeBook(overrides: Partial<BookDetail> = {}): BookDetail {
  return {
    id: 1,
    libraryId: 1,
    libraryName: 'Fiction',
    status: 'ready',
    addedAt: '2024-01-01T00:00:00.000Z',
    title: 'The Hobbit',
    subtitle: null,
    description: 'A hobbit goes on an unexpected journey.',
    isbn10: '0261103342',
    isbn13: '9780261103344',
    publisher: 'Allen & Unwin',
    publishedYear: 1937,
    language: 'en',
    pageCount: 310,
    seriesId: null,
    seriesName: null,
    seriesIndex: null,
    rating: null,
    coverSource: null,
    providerIds: { goodreads: '5907' },
    authors: [{ id: 1, name: 'J.R.R. Tolkien', sortName: 'Tolkien, J.R.R.' }],
    genres: ['Fantasy'],
    tags: ['favorites'],
    files: [],
    audioMetadata: null,
    ...overrides,
  };
}

function renderScreen(): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <BookDetailScreen />
    </QueryClientProvider>
  );
}

describe('BookDetailScreen', () => {
  beforeEach(() => {
    mockGetBookDetail.mockReset();
  });

  it('renders the synopsis, details, Goodreads link and tags', async () => {
    mockGetBookDetail.mockResolvedValue(makeBook());
    const { getByText } = await render(renderScreen());

    await waitFor(() => expect(getByText('A hobbit goes on an unexpected journey.')).toBeTruthy());

    // Details
    expect(getByText('Pages')).toBeTruthy();
    expect(getByText('310')).toBeTruthy();
    expect(getByText('EN')).toBeTruthy();
    expect(getByText('Allen & Unwin')).toBeTruthy();
    expect(getByText('9780261103344')).toBeTruthy();

    // Goodreads link + tags
    expect(getByText('View on Goodreads')).toBeTruthy();
    expect(getByText('favorites')).toBeTruthy();
  });

  it('omits sections that have no populated data', async () => {
    mockGetBookDetail.mockResolvedValue(
      makeBook({ description: null, providerIds: {}, tags: [], genres: [] }),
    );
    const { queryByText } = await render(renderScreen());

    await waitFor(() => expect(queryByText('Pages')).toBeTruthy());
    expect(queryByText('Synopsis')).toBeNull();
    expect(queryByText('View on Goodreads')).toBeNull();
    expect(queryByText('Tags')).toBeNull();
  });
});
