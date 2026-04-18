import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCollectionBySlugFromSupabase, getCollectionsFromSupabase } from '@/entities/collection/api/collectionService.supabase';

const supabaseMaybeSingleMock = vi.fn();
const supabaseSelectMock = vi.fn();

vi.mock('@/shared/services/supabase', () => ({
  supabaseMaybeSingle: (...args: unknown[]) => supabaseMaybeSingleMock(...args),
  supabaseSelect: (...args: unknown[]) => supabaseSelectMock(...args),
}));

describe('collectionService.supabase', () => {
  beforeEach(() => {
    supabaseMaybeSingleMock.mockReset();
    supabaseSelectMock.mockReset();
  });

  it('hydrates collection totals and worth from Supabase item/profile data', async () => {
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
          id: 'item-1',
          collection_id: 'collection-1',
          attributes: { materials: ['Silver', 'Bronze'] },
        },
        {
          id: 'item-2',
          collection_id: 'collection-1',
          attributes: { material: 'Bronze' },
        },
      ])
      .mockResolvedValueOnce([
        {
          item_id: 'item-1',
          estimated_public_price_min: 1000,
          estimated_public_price_max: 1500,
        },
        {
          item_id: 'item-2',
          estimated_public_price_min: 500,
          estimated_public_price_max: 700,
        },
      ]);

    const collections = await getCollectionsFromSupabase();

    expect(collections).toHaveLength(1);
    expect(collections[0]).toMatchObject({
      slug: 'british',
      itemCount: 2,
      filterableMaterials: ['Bronze', 'Silver'],
      estimatedWorth: 1850,
    });
  });

  it('hydrates a single collection worth from Supabase item/profile data', async () => {
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

    supabaseSelectMock
      .mockResolvedValueOnce([
        {
          id: 'item-1',
          collection_id: 'collection-1',
          attributes: { materials: ['Silver'] },
        },
      ])
      .mockResolvedValueOnce([
        {
          item_id: 'item-1',
          estimated_public_price_min: 5000,
          estimated_public_price_max: 6000,
        },
      ]);

    const collection = await getCollectionBySlugFromSupabase('british');

    expect(collection).toMatchObject({
      slug: 'british',
      itemCount: 1,
      filterableMaterials: ['Silver'],
      estimatedWorth: 5500,
    });
  });
});
