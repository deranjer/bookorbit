import { api } from './client';
import type { BooksPage, BookQuery, Library } from './types';

export async function getLibraries(): Promise<Library[]> {
  const { data } = await api.get<Library[]>('/libraries');
  return data;
}

export async function getLibraryBooks(libraryId: number, opts: { page?: number; size?: number; q?: string } = {}): Promise<BooksPage> {
  const query: BookQuery = {
    sort: [{ field: 'title', dir: 'asc' }],
    pagination: { page: opts.page ?? 0, size: opts.size ?? 50 },
    ...(opts.q ? { q: opts.q } : {}),
  };
  const { data } = await api.post<BooksPage>(`/libraries/${libraryId}/books`, query);
  return data;
}
