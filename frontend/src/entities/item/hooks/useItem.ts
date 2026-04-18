import { useQuery } from '@tanstack/react-query';
import { getItemById, getRelatedItems } from '@/entities/item/api/itemService';
import { ItemRecord } from '@/entities/item/model/types';
import { queryKeys } from '@/shared/lib/queryKeys';

export function useItem(itemId: string) {
  return useQuery({
    queryKey: queryKeys.item(itemId),
    queryFn: () => getItemById(itemId),
    enabled: Boolean(itemId),
  });
}

export function useRelatedItems(item: ItemRecord | null | undefined) {
  return useQuery({
    queryKey: queryKeys.relatedItems(item?.id ?? ''),
    queryFn: () => getRelatedItems(item as ItemRecord),
    enabled: Boolean(item),
  });
}
