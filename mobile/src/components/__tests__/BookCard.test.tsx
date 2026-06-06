import { render } from '@testing-library/react-native';
import { BookCard } from '../BookCard';
import type { BookCard as BookCardType } from '@/src/api/types';

function makeBook(overrides: Partial<BookCardType> = {}): BookCardType {
  return {
    id: 1,
    title: 'The Hobbit',
    authors: ['J.R.R. Tolkien'],
    seriesName: null,
    seriesIndex: null,
    files: [{ format: 'epub' } as BookCardType['files'][number]],
    publishedYear: 1937,
    language: 'en',
    genres: [],
    rating: null,
    readingProgress: null,
    addedAt: '2024-01-01T00:00:00.000Z',
    hasCover: false,
    tags: [],
    narrators: [],
    ...overrides,
  };
}

describe('BookCard', () => {
  it('renders the title and author', async () => {
    // With no cover the title appears twice (placeholder + meta), so match all.
    const { getAllByText, getByText } = await render(<BookCard book={makeBook()} />);
    expect(getAllByText('The Hobbit').length).toBeGreaterThan(0);
    expect(getByText('J.R.R. Tolkien')).toBeTruthy();
  });

  it('shows the uppercased format badge from the primary file', async () => {
    const { getByText } = await render(<BookCard book={makeBook()} />);
    expect(getByText('EPUB')).toBeTruthy();
  });

  it('falls back to a placeholder title when title is null', async () => {
    const { getByText } = await render(<BookCard book={makeBook({ title: null })} />);
    expect(getByText('Unknown Title')).toBeTruthy();
  });
});
