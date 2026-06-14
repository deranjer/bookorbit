import { api } from './client';
import type { BooksPage, Collection, CollectionWithMembership } from './types';

export async function getCollections(): Promise<Collection[]> {
  const { data } = await api.get<Collection[]>('/collections');
  return data;
}

// Returns every collection with a memberCount reflecting whether `bookId` is in it.
export async function getCollectionsForBook(bookId: number): Promise<CollectionWithMembership[]> {
  const { data } = await api.get<CollectionWithMembership[]>('/collections', { params: { bookIds: String(bookId) } });
  return data;
}

export async function addBookToCollection(collectionId: number, bookId: number): Promise<void> {
  await api.post(`/collections/${collectionId}/books`, { bookIds: [bookId] });
}

export async function removeBookFromCollection(collectionId: number, bookId: number): Promise<void> {
  await api.delete(`/collections/${collectionId}/books`, { data: { bookIds: [bookId] } });
}

export async function getCollectionBooks(id: number, opts: { page?: number; size?: number; q?: string } = {}): Promise<BooksPage> {
  const { data } = await api.get<BooksPage>(`/collections/${id}/books`, {
    params: { page: opts.page ?? 0, size: opts.size ?? 50, ...(opts.q ? { q: opts.q } : {}) },
  });
  return data;
}
