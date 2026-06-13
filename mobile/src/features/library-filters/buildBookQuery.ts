import type { BookQuery, GroupRule, Rule } from '@/src/api/types';
import type { LibraryFilters, LibrarySort } from './filterTypes';

// Translate the curated filter state into the server rule list. Every populated
// control contributes exactly one rule; empty controls are skipped.
function buildRules(filters: LibraryFilters): Rule[] {
  const rules: Rule[] = [];

  if (filters.readStatus.length > 0) {
    rules.push({ type: 'rule', field: 'readStatus', operator: 'includesAny', value: filters.readStatus });
  }

  if (filters.readProgress) {
    const operator =
      filters.readProgress === 'unread' ? 'isUnread' : filters.readProgress === 'finished' ? 'isFinished' : 'isInProgress';
    rules.push({ type: 'rule', field: 'readProgress', operator });
  }

  if (filters.formats.length > 0) {
    rules.push({ type: 'rule', field: 'format', operator: 'includesAny', value: filters.formats });
  }

  if (filters.fileAvailability) {
    rules.push({
      type: 'rule',
      field: 'fileAvailability',
      operator: filters.fileAvailability === 'present' ? 'isPresent' : 'isMissing',
    });
  }

  if (filters.authors.length > 0) {
    rules.push({ type: 'rule', field: 'author', operator: 'includesAny', value: filters.authors });
  }

  if (filters.genres.length > 0) {
    rules.push({ type: 'rule', field: 'genre', operator: 'includesAny', value: filters.genres });
  }

  if (filters.tags.length > 0) {
    rules.push({ type: 'rule', field: 'tag', operator: 'includesAny', value: filters.tags });
  }

  if (filters.languages.length > 0) {
    rules.push({ type: 'rule', field: 'language', operator: 'includesAny', value: filters.languages });
  }

  if (filters.minRating != null) {
    rules.push({ type: 'rule', field: 'rating', operator: 'gte', value: filters.minRating });
  }

  if (filters.yearFrom != null && filters.yearTo != null) {
    rules.push({ type: 'rule', field: 'publishedYear', operator: 'between', value: filters.yearFrom, valueTo: filters.yearTo });
  } else if (filters.yearFrom != null) {
    rules.push({ type: 'rule', field: 'publishedYear', operator: 'gte', value: filters.yearFrom });
  } else if (filters.yearTo != null) {
    rules.push({ type: 'rule', field: 'publishedYear', operator: 'lte', value: filters.yearTo });
  }

  return rules;
}

export function buildBookQuery(
  filters: LibraryFilters,
  sort: LibrarySort,
  page: { page: number; size: number; q?: string },
): BookQuery {
  const rules = buildRules(filters);
  const filter: GroupRule | undefined = rules.length > 0 ? { type: 'group', join: 'AND', rules } : undefined;

  return {
    sort: [{ field: sort.field, dir: sort.dir }],
    pagination: { page: page.page, size: page.size },
    ...(filter ? { filter } : {}),
    ...(page.q ? { q: page.q } : {}),
  };
}

// Number of active filter controls — drives the header badge.
export function countActiveFilters(filters: LibraryFilters): number {
  return buildRules(filters).length;
}
