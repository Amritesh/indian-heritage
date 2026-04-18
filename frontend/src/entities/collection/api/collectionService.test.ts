import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCollectionsFromSupabaseMock = vi.fn();
const getCollectionBySlugFromSupabaseMock = vi.fn();

vi.mock('@/shared/config/supabase', () => ({
  hasSupabaseEnv: true,
}));

vi.mock('@/shared/config/firebase', () => ({
  firestore: null,
}));

vi.mock('@/shared/config/collections', () => ({
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

vi.mock('@/entities/collection/api/collectionService.supabase', () => ({
  getCollectionsFromSupabase: (...args: unknown[]) => getCollectionsFromSupabaseMock(...args),
  getCollectionBySlugFromSupabase: (...args: unknown[]) => getCollectionBySlugFromSupabaseMock(...args),
}));

import { getCollectionBySlug, getCollections } from '@/entities/collection/api/collectionService';

describe('collectionService', () => {
  beforeEach(() => {
    getCollectionsFromSupabaseMock.mockReset();
    getCollectionBySlugFromSupabaseMock.mockReset();
  });

  it('does not fall back to registry collections when Supabase is enabled', async () => {
    getCollectionsFromSupabaseMock.mockResolvedValue([]);

    await expect(getCollections()).resolves.toEqual([]);
  });

  it('does not fall back to registry detail when Supabase is enabled', async () => {
    getCollectionBySlugFromSupabaseMock.mockResolvedValue(null);

    await expect(getCollectionBySlug('legacy')).resolves.toBeNull();
  });
});
