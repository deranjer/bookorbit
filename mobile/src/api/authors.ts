import { api } from './client';
import type { AuthorsPage, BooksPage } from './types';

export async function getAuthors(opts: { page?: number; size?: number; q?: string } = {}): Promise<AuthorsPage> {
  const { data } = await api.get<AuthorsPage>('/authors', {
    params: { page: opts.page ?? 0, size: opts.size ?? 100, sort: 'name', order: 'asc', ...(opts.q ? { q: opts.q } : {}) },
  });
  return data;
}

export async function getAuthorBooks(id: number, opts: { page?: number; size?: number } = {}): Promise<BooksPage> {
  const { data } = await api.get<BooksPage>(`/authors/${id}/books`, {
    params: { page: opts.page ?? 0, size: opts.size ?? 100 },
  });
  return data;
}
