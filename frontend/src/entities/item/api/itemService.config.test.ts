import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadItemService(hasSupabaseEnv: boolean) {
  vi.resetModules();

  vi.doMock('@/shared/config/supabase', () => ({
    hasSupabaseEnv,
  }));

  vi.doMock('@/shared/config/firebase', () => ({
    firestore: null,
  }));

  vi.doMock('@/shared/services/firestore', () => ({
    getFirestoreOrThrow: vi.fn(() => {
      throw new Error('Firestore should not be used');
    }),
  }));

  vi.doMock('@/shared/config/collections', () => ({
    collectionRegistry: [
      {
        id: 'legacy',
        slug: 'legacy',
        name: 'Legacy Collection',
        enabled: true,
        sourceUrl: 'https://example.com/legacy.json',
      },
    ],
    getCollectionRegistryEntry: () => ({
      id: 'legacy',
      slug: 'legacy',
      name: 'Legacy Collection',
      enabled: true,
      sourceUrl: 'https://example.com/legacy.json',
    }),
  }));

  vi.doMock('@/entities/item/api/itemService.supabase', () => ({
    getCollectionItemsBySlugFromSupabase: vi.fn(async () => []),
    getItemByIdFromSupabase: vi.fn(async () => null),
    getRelatedItemsFromSupabase: vi.fn(async () => []),
    searchItemsFromSupabase: vi.fn(async () => []),
  }));

  return import('@/entities/item/api/itemService');
}

describe('itemService Supabase enforcement', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects public item reads when Supabase config is missing', async () => {
    const service = await loadItemService(false);

    await expect(service.getCollectionItemsPage({ collectionSlug: 'legacy' })).rejects.toThrow(/Supabase/i);
    await expect(service.getItemById('legacy-coin-1')).rejects.toThrow(/Supabase/i);
    await expect(service.searchItems('akbar')).rejects.toThrow(/Supabase/i);
  });
});
