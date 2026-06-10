import { api } from './client';
import type { AudioProgress, BookDetail, SearchResult } from './types';

export async function searchBooks(q: string, limit = 20): Promise<SearchResult[]> {
  const { data } = await api.get<SearchResult[]>('/books/search', { params: { q, limit } });
  return data;
}

export async function getBookDetail(id: number): Promise<BookDetail> {
  const { data } = await api.get<BookDetail>(`/books/${id}`);
  return data;
}

export async function getAudioProgress(bookId: number): Promise<AudioProgress | null> {
  const { data } = await api.get<AudioProgress | null>(`/books/${bookId}/audio-progress`);
  return data ?? null;
}

export async function saveAudioProgress(bookId: number, body: AudioProgress): Promise<void> {
  await api.patch(`/books/${bookId}/audio-progress`, body);
}
