import { useInfiniteQuery } from '@tanstack/react-query';
import { getCollectionItemsPage, DEFAULT_PAGE_SIZE } from '@/entities/item/api/itemService';
import { CollectionItemQuery } from '@/entities/item/model/types';

export function useCollectionItems(queryConfig: CollectionItemQuery) {
  return useInfiniteQuery({
    queryKey: [
      'collection-items',
      queryConfig.collectionSlug,
      queryConfig.sort ?? 'featured',
      queryConfig.material ?? '',
      queryConfig.search ?? '',
    ],
    queryFn: ({ pageParam }) =>
      getCollectionItemsPage(queryConfig, pageParam ?? null),
    initialPageParam: null as Parameters<typeof getCollectionItemsPage>[1],
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.cursor : undefined),
    enabled: Boolean(queryConfig.collectionSlug),
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
      items: data.pages.flatMap((p) => p.items),
      hasMore: data.pages[data.pages.length - 1]?.hasMore ?? false,
      totalLoaded: data.pages.reduce((sum, p) => sum + p.items.length, 0),
    }),
  });
}

export { DEFAULT_PAGE_SIZE };
