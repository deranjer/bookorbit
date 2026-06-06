import { api } from './client';
import type { SeriesBooksPage, SeriesPage } from './types';

export async function getSeries(opts: { page?: number; size?: number; q?: string } = {}): Promise<SeriesPage> {
  const { data } = await api.get<SeriesPage>('/series', {
    params: { page: opts.page ?? 0, size: opts.size ?? 100, sort: 'name', order: 'asc', ...(opts.q ? { q: opts.q } : {}) },
  });
  return data;
}

export async function getSeriesBooks(name: string, opts: { page?: number; size?: number } = {}): Promise<SeriesBooksPage> {
  const { data } = await api.get<SeriesBooksPage>(`/series/${encodeURIComponent(name)}/books`, {
    params: { page: opts.page ?? 0, size: opts.size ?? 100 },
  });
  return data;
}
