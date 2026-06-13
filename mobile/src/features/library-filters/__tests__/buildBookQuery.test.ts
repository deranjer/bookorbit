import { buildBookQuery, countActiveFilters } from '../buildBookQuery';
import { DEFAULT_FILTERS, DEFAULT_SORT, type LibraryFilters } from '../filterTypes';

function makeFilters(overrides: Partial<LibraryFilters>): LibraryFilters {
  return { ...DEFAULT_FILTERS, ...overrides };
}

const page = { page: 0, size: 50 };

describe('buildBookQuery', () => {
  it('omits filter when nothing is active', () => {
    const q = buildBookQuery(DEFAULT_FILTERS, DEFAULT_SORT, page);
    expect(q.filter).toBeUndefined();
    expect(q.sort).toEqual([{ field: 'title', dir: 'asc' }]);
    expect(q.pagination).toEqual({ page: 0, size: 50 });
  });

  it('carries the chosen sort and direction', () => {
    const q = buildBookQuery(DEFAULT_FILTERS, { field: 'addedAt', dir: 'desc' }, page);
    expect(q.sort).toEqual([{ field: 'addedAt', dir: 'desc' }]);
  });

  it('includes the search term only when present', () => {
    expect(buildBookQuery(DEFAULT_FILTERS, DEFAULT_SORT, { ...page, q: 'dune' }).q).toBe('dune');
    expect(buildBookQuery(DEFAULT_FILTERS, DEFAULT_SORT, page).q).toBeUndefined();
  });

  it('maps multi-value chips to includesAny rules', () => {
    const q = buildBookQuery(makeFilters({ formats: ['epub', 'pdf'], readStatus: ['reading'] }), DEFAULT_SORT, page);
    expect(q.filter).toEqual({
      type: 'group',
      join: 'AND',
      rules: [
        { type: 'rule', field: 'readStatus', operator: 'includesAny', value: ['reading'] },
        { type: 'rule', field: 'format', operator: 'includesAny', value: ['epub', 'pdf'] },
      ],
    });
  });

  it('maps reading progress to the matching stateful operator', () => {
    expect(buildBookQuery(makeFilters({ readProgress: 'inProgress' }), DEFAULT_SORT, page).filter?.rules[0]).toEqual({
      type: 'rule',
      field: 'readProgress',
      operator: 'isInProgress',
    });
    expect(buildBookQuery(makeFilters({ readProgress: 'unread' }), DEFAULT_SORT, page).filter?.rules[0]).toMatchObject({
      operator: 'isUnread',
    });
    expect(buildBookQuery(makeFilters({ readProgress: 'finished' }), DEFAULT_SORT, page).filter?.rules[0]).toMatchObject({
      operator: 'isFinished',
    });
  });

  it('maps file availability to isPresent / isMissing', () => {
    expect(buildBookQuery(makeFilters({ fileAvailability: 'present' }), DEFAULT_SORT, page).filter?.rules[0]).toMatchObject({
      field: 'fileAvailability',
      operator: 'isPresent',
    });
    expect(buildBookQuery(makeFilters({ fileAvailability: 'missing' }), DEFAULT_SORT, page).filter?.rules[0]).toMatchObject({
      operator: 'isMissing',
    });
  });

  it('maps minimum rating to a gte rule', () => {
    expect(buildBookQuery(makeFilters({ minRating: 4 }), DEFAULT_SORT, page).filter?.rules[0]).toEqual({
      type: 'rule',
      field: 'rating',
      operator: 'gte',
      value: 4,
    });
  });

  it('uses between when both year bounds are set', () => {
    expect(buildBookQuery(makeFilters({ yearFrom: 1990, yearTo: 2000 }), DEFAULT_SORT, page).filter?.rules[0]).toEqual({
      type: 'rule',
      field: 'publishedYear',
      operator: 'between',
      value: 1990,
      valueTo: 2000,
    });
  });

  it('uses gte / lte when only one year bound is set', () => {
    expect(buildBookQuery(makeFilters({ yearFrom: 1990 }), DEFAULT_SORT, page).filter?.rules[0]).toMatchObject({
      operator: 'gte',
      value: 1990,
    });
    expect(buildBookQuery(makeFilters({ yearTo: 2000 }), DEFAULT_SORT, page).filter?.rules[0]).toMatchObject({
      operator: 'lte',
      value: 2000,
    });
  });

  it('maps content facets to includesAny rules', () => {
    const q = buildBookQuery(
      makeFilters({ authors: ['Sanderson'], genres: ['Fantasy'], tags: ['epic'], languages: ['en'] }),
      DEFAULT_SORT,
      page,
    );
    const fields = q.filter?.rules.map((r) => 'field' in r && r.field);
    expect(fields).toEqual(['author', 'genre', 'tag', 'language']);
    q.filter?.rules.forEach((r) => expect(r).toMatchObject({ operator: 'includesAny' }));
  });
});

describe('countActiveFilters', () => {
  it('counts each active control once', () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
    expect(
      countActiveFilters(
        makeFilters({ formats: ['epub'], readStatus: ['read'], minRating: 3, yearFrom: 1990, yearTo: 2000 }),
      ),
    ).toBe(4); // formats + readStatus + rating + year(range counts once)
  });
});
