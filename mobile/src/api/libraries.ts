import { api } from './client';
import type { BooksPage, BookQuery, GroupRule, Library, SortSpec } from './types';

export async function getLibraries(): Promise<Library[]> {
  const { data } = await api.get<Library[]>('/libraries');
  return data;
}

export async function getLibraryBooks(
  libraryId: number,
  opts: { page?: number; size?: number; q?: string; sort?: SortSpec[]; filter?: GroupRule } = {},
): Promise<BooksPage> {
  const query: BookQuery = {
    sort: opts.sort && opts.sort.length > 0 ? opts.sort : [{ field: 'title', dir: 'asc' }],
    pagination: { page: opts.page ?? 0, size: opts.size ?? 50 },
    ...(opts.filter ? { filter: opts.filter } : {}),
    ...(opts.q ? { q: opts.q } : {}),
  };
  const { data } = await api.post<BooksPage>(`/libraries/${libraryId}/books`, query);
  return data;
}
