import { api } from './client';
import type { BooksPage, SmartScope } from './types';

export async function getSmartScopes(): Promise<SmartScope[]> {
  const { data } = await api.get<SmartScope[]>('/smart-scopes');
  return data;
}

export async function getSmartScopeBooks(id: number, opts: { page?: number; size?: number; q?: string } = {}): Promise<BooksPage> {
  const { data } = await api.get<BooksPage>(`/smart-scopes/${id}/books`, {
    params: { page: opts.page ?? 0, size: opts.size ?? 50, ...(opts.q ? { q: opts.q } : {}) },
  });
  return data;
}
