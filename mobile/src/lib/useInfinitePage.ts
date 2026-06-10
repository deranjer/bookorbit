import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';

export const PAGE_SIZE = 50;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

interface UseInfinitePageArgs<P> {
  queryKey: QueryKey;
  fetchPage: (page: number) => Promise<P>;
  enabled?: boolean;
}

// Wraps useInfiniteQuery for the server's `{ items, total, page, size }` shape:
// requests the next 0-indexed page until every item is loaded, and flattens the
// pages into a single array for list rendering.
export function useInfinitePage<P extends Paginated<unknown>>({ queryKey, fetchPage, enabled = true }: UseInfinitePageArgs<P>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    enabled,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const loaded = (lastPage.page + 1) * lastPage.size;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });

  const items = (query.data?.pages.flatMap((page) => page.items) ?? []) as P['items'];
  const total = query.data?.pages[0]?.total ?? null;

  const loadMore = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
  };

  return { ...query, items, total, loadMore };
}
