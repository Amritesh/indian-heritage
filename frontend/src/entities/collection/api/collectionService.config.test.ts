import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadCollectionService(hasSupabaseEnv: boolean) {
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
        description: 'legacy',
        longDescription: 'legacy',
        heroEyebrow: '',
        culture: '',
        periodLabel: '',
        sourceUrl: 'https://example.com/legacy.json',
        order: 1,
        enabled: true,
      },
    ],
  }));

  vi.doMock('@/entities/collection/api/collectionService.supabase', () => ({
    getCollectionsFromSupabase: vi.fn(async () => []),
    getCollectionBySlugFromSupabase: vi.fn(async () => null),
  }));

  return import('@/entities/collection/api/collectionService');
}

describe('collectionService Supabase enforcement', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects public collection reads when Supabase config is missing', async () => {
    const service = await loadCollectionService(false);

    await expect(service.getCollections()).rejects.toThrow(/Supabase/i);
    await expect(service.getCollectionBySlug('legacy')).rejects.toThrow(/Supabase/i);
  });
});
