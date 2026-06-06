import { api } from './client';
import type { BookCard, ScrollerType } from './types';

export async function getScroller(type: ScrollerType, opts: { limit?: number; smartScopeId?: number } = {}): Promise<BookCard[]> {
  const { data } = await api.get<BookCard[]>(`/dashboard/scrollers/${type}`, {
    params: { limit: opts.limit ?? 20, ...(opts.smartScopeId ? { smartScopeId: opts.smartScopeId } : {}) },
  });
  return data;
}
