import { CollectionItemQuery } from '@/entities/item/model/types';

export const queryKeys = {
  collections: () => ['collections'] as const,
  collection: (slug: string) => ['collections', slug] as const,
  collectionItems: (params: CollectionItemQuery) =>
    [
      'collection-items',
      params.collectionSlug,
      params.sort ?? 'featured',
      params.material ?? '',
      params.search ?? '',
      params.tag ?? '',
      params.limit ?? 24,
    ] as const,
  item: (itemId: string) => ['item', itemId] as const,
  relatedItems: (itemId: string) => ['related-items', itemId] as const,
  search: (term: string, collectionSlug?: string, tag?: string) =>
    ['search', collectionSlug ?? 'all', term, tag ?? ''] as const,
};
