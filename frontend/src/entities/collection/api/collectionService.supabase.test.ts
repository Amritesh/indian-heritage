import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCollectionBySlugFromSupabase, getCollectionsFromSupabase } from '@/entities/collection/api/collectionService.supabase';

const supabaseCountMock = vi.fn();
const supabaseMaybeSingleMock = vi.fn();
const supabaseSelectMock = vi.fn();

vi.mock('@/shared/services/supabase', () => ({
  supabaseCount: (...args: unknown[]) => supabaseCountMock(...args),
  supabaseMaybeSingle: (...args: unknown[]) => supabaseMaybeSingleMock(...args),
  supabaseSelect: (...args: unknown[]) => supabaseSelectMock(...args),
}));

describe('collectionService.supabase', () => {
  beforeEach(() => {
    supabaseCountMock.mockReset();
    supabaseMaybeSingleMock.mockReset();
    supabaseSelectMock.mockReset();
  });

  it('hydrates collection totals from Supabase counts', async () => {
    supabaseSelectMock
      .mockResolvedValueOnce([
        {
          id: 'collection-1',
          canonical_id: 'ahg:collection:coins:british',
          slug: 'british',
          title: 'British India',
          subtitle: null,
          description: 'desc',
          long_description: null,
          era_label: 'Colonial',
          country_code: 'IN',
          cover_image_path: 'hero.png',
          status: 'published',
          sort_order: 1,
          domain_id: 'domain-1',
        },
      ])
      .mockResolvedValueOnce([
        {
          collection_id: 'collection-1',
          attributes: { materials: ['Silver', 'Bronze'] },
        },
      ]);

    supabaseCountMock.mockResolvedValue(888);

    const collections = await getCollectionsFromSupabase();

    expect(collections).toHaveLength(1);
    expect(collections[0]).toMatchObject({
      slug: 'british',
      itemCount: 888,
      filterableMaterials: ['Bronze', 'Silver'],
    });
  });

  it('hydrates a single collection total from Supabase count', async () => {
    supabaseMaybeSingleMock.mockResolvedValue({
      id: 'collection-1',
      canonical_id: 'ahg:collection:coins:british',
      slug: 'british',
      title: 'British India',
      subtitle: null,
      description: 'desc',
      long_description: null,
      era_label: 'Colonial',
      country_code: 'IN',
      cover_image_path: 'hero.png',
      status: 'published',
      sort_order: 1,
      domain_id: 'domain-1',
    });

    supabaseSelectMock.mockResolvedValue([
      {
        collection_id: 'collection-1',
        attributes: { materials: ['Silver'] },
      },
    ]);
    supabaseCountMock.mockResolvedValue(251);

    const collection = await getCollectionBySlugFromSupabase('british');

    expect(collection).toMatchObject({
      slug: 'british',
      itemCount: 251,
      filterableMaterials: ['Silver'],
    });
  });
});
