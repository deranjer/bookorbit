import { api } from './client';
import type { AudioProgress, BookDetail, BookRecommendation, ReadStatus, SearchResult, UserBookStatus } from './types';

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

export async function setReadStatus(bookId: number, status: ReadStatus): Promise<UserBookStatus> {
  const { data } = await api.patch<UserBookStatus>(`/books/${bookId}/status`, { status });
  return data;
}

// Rating is shared book metadata (1–5, or null to clear). The single-book path
// reuses the bulk endpoint with one id, matching the web client.
export async function setRating(bookId: number, rating: number | null): Promise<void> {
  await api.post('/books/bulk-set-rating', { bookIds: [bookId], rating });
}

export async function getRecommendations(bookId: number): Promise<BookRecommendation[]> {
  const { data } = await api.get<BookRecommendation[]>(`/books/${bookId}/recommendations`);
  return data;
}

export async function getAuthorBooks(bookId: number): Promise<BookRecommendation[]> {
  const { data } = await api.get<BookRecommendation[]>(`/books/${bookId}/author-books`);
  return data;
}
