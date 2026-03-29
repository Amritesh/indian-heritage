import { useQuery } from '@tanstack/react-query';
import { getCollectionItems } from '@/entities/item/api/itemService';
import { CollectionItemQuery } from '@/entities/item/model/types';
import { queryKeys } from '@/shared/lib/queryKeys';

export function useCollectionItems(queryConfig: CollectionItemQuery) {
  return useQuery({
    queryKey: queryKeys.collectionItems(queryConfig),
    queryFn: () => getCollectionItems(queryConfig),
    enabled: Boolean(queryConfig.collectionSlug),
  });
}
