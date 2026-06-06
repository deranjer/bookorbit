import { api } from './client';
import type { BooksPage, Collection } from './types';

export async function getCollections(): Promise<Collection[]> {
  const { data } = await api.get<Collection[]>('/collections');
  return data;
}

export async function getCollectionBooks(id: number, opts: { page?: number; size?: number; q?: string } = {}): Promise<BooksPage> {
  const { data } = await api.get<BooksPage>(`/collections/${id}/books`, {
    params: { page: opts.page ?? 0, size: opts.size ?? 50, ...(opts.q ? { q: opts.q } : {}) },
  });
  return data;
}
