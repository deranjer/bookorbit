import { api } from './client';
import type { BookDetail, SearchResult } from './types';

export async function searchBooks(q: string, limit = 20): Promise<SearchResult[]> {
  const { data } = await api.get<SearchResult[]>('/books/search', { params: { q, limit } });
  return data;
}

export async function getBookDetail(id: number): Promise<BookDetail> {
  const { data } = await api.get<BookDetail>(`/books/${id}`);
  return data;
}
