import { api } from './client';

// The server's catalog endpoints (GET /metadata/{authors,genres,tags,languages}?q=)
// each return a list of { name } rows used to power filter typeaheads.
interface NamedResult {
  name: string;
}

async function searchCatalog(path: string, q: string): Promise<string[]> {
  const term = q.trim();
  if (!term) return [];
  const { data } = await api.get<NamedResult[]>(`/metadata/${path}`, { params: { q: term } });
  return data.map((row) => row.name).filter((name): name is string => Boolean(name));
}

export function searchAuthors(q: string): Promise<string[]> {
  return searchCatalog('authors', q);
}

export function searchGenres(q: string): Promise<string[]> {
  return searchCatalog('genres', q);
}

export function searchTags(q: string): Promise<string[]> {
  return searchCatalog('tags', q);
}

export function searchLanguages(q: string): Promise<string[]> {
  return searchCatalog('languages', q);
}
