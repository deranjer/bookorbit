import { api } from './client';
import type { SearchResult } from './types';

export async function searchBooks(q: string, limit = 20): Promise<SearchResult[]> {
  const { data } = await api.get<SearchResult[]>('/books/search', { params: { q, limit } });
  return data;
}
