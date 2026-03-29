import { useQuery } from '@tanstack/react-query';
import { getCollectionBySlug, getCollections } from '@/entities/collection/api/collectionService';
import { queryKeys } from '@/shared/lib/queryKeys';

export function useCollections() {
  return useQuery({
    queryKey: queryKeys.collections(),
    queryFn: getCollections,
  });
}

export function useCollection(slug: string) {
  return useQuery({
    queryKey: queryKeys.collection(slug),
    queryFn: () => getCollectionBySlug(slug),
    enabled: Boolean(slug),
  });
}
