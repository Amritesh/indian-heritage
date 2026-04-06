import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCollectionItemsBySlugFromSupabaseMock = vi.fn();
const getItemByIdFromSupabaseMock = vi.fn();
const getRelatedItemsFromSupabaseMock = vi.fn();
const searchItemsFromSupabaseMock = vi.fn();

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

vi.mock('@/entities/item/api/itemService.supabase', () => ({
  getCollectionItemsBySlugFromSupabase: (...args: unknown[]) => getCollectionItemsBySlugFromSupabaseMock(...args),
  getItemByIdFromSupabase: (...args: unknown[]) => getItemByIdFromSupabaseMock(...args),
  getRelatedItemsFromSupabase: (...args: unknown[]) => getRelatedItemsFromSupabaseMock(...args),
  searchItemsFromSupabase: (...args: unknown[]) => searchItemsFromSupabaseMock(...args),
}));

import { getCollectionItemsPage, getItemById, getRelatedItems, searchItems } from '@/entities/item/api/itemService';

describe('itemService', () => {
  beforeEach(() => {
    getCollectionItemsBySlugFromSupabaseMock.mockReset();
    getItemByIdFromSupabaseMock.mockReset();
    getRelatedItemsFromSupabaseMock.mockReset();
    searchItemsFromSupabaseMock.mockReset();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch should not be used')));
  });

  it('does not fall back to legacy fetch when a Supabase item lookup misses', async () => {
    getItemByIdFromSupabaseMock.mockResolvedValue(null);

    await expect(getItemById('missing-item')).resolves.toBeNull();
  });

  it('does not fall back to legacy fetch for collection items when Supabase is enabled', async () => {
    getCollectionItemsBySlugFromSupabaseMock.mockResolvedValue([]);

    await expect(getCollectionItemsPage({ collectionSlug: 'legacy' })).resolves.toMatchObject({
      items: [],
      hasMore: false,
      total: 0,
    });
  });

  it('returns filtered totals from Supabase-backed collection pages', async () => {
    getCollectionItemsBySlugFromSupabaseMock.mockResolvedValue([
      {
        id: '1',
        collectionId: 'collection-1',
        collectionSlug: 'legacy',
        collectionName: 'Legacy',
        title: 'Akbar Rupee',
        subtitle: '',
        period: '',
        dateText: '',
        culture: '',
        location: '',
        description: '',
        shortDescription: '',
        imageUrl: '',
        imageAlt: '',
        primaryMedia: null,
        gallery: [],
        materials: [],
        tags: ['silver'],
        publicTags: ['Mughals'],
        entityBadges: ['Akbar'],
        notes: [],
        pageNumber: 1,
        searchText: 'akbar rupee mughals',
        searchKeywords: ['akbar', 'rupee'],
        denominationSystem: '',
        denominationKey: null,
        denominationRank: 0,
        denominationBaseValue: null,
        sortYearStart: 0,
        sortYearEnd: null,
        estimatedPriceMin: 1000,
        estimatedPriceMax: 2000,
        estimatedPriceAvg: 1500,
        weightGrams: null,
        sortYear: 0,
        metadata: {},
      },
      {
        id: '2',
        collectionId: 'collection-1',
        collectionSlug: 'legacy',
        collectionName: 'Legacy',
        title: 'Jahangir Rupee',
        subtitle: '',
        period: '',
        dateText: '',
        culture: '',
        location: '',
        description: '',
        shortDescription: '',
        imageUrl: '',
        imageAlt: '',
        primaryMedia: null,
        gallery: [],
        materials: [],
        tags: ['silver'],
        publicTags: ['Mughals'],
        entityBadges: ['Jahangir'],
        notes: [],
        pageNumber: 2,
        searchText: 'jahangir rupee mughals',
        searchKeywords: ['jahangir', 'rupee'],
        denominationSystem: '',
        denominationKey: null,
        denominationRank: 0,
        denominationBaseValue: null,
        sortYearStart: 0,
        sortYearEnd: null,
        estimatedPriceMin: 2000,
        estimatedPriceMax: 3000,
        estimatedPriceAvg: 2500,
        weightGrams: null,
        sortYear: 0,
        metadata: {},
      },
    ]);

    await expect(getCollectionItemsPage({ collectionSlug: 'legacy', search: 'akbar' })).resolves.toMatchObject({
      items: [expect.objectContaining({ id: '1' })],
      hasMore: false,
      total: 1,
    });
  });

  it('does not fall back to legacy fetch for search when Supabase is enabled', async () => {
    searchItemsFromSupabaseMock.mockResolvedValue([]);

    await expect(searchItems('akbar')).resolves.toEqual([]);
  });

  it('does not fall back to legacy related items when Supabase is enabled', async () => {
    getRelatedItemsFromSupabaseMock.mockResolvedValue([]);

    await expect(getRelatedItems({
      id: 'item-1',
      collectionId: 'collection-1',
      collectionSlug: 'legacy',
      collectionName: 'Legacy',
      title: 'Coin',
      subtitle: '',
      period: '',
      dateText: '',
      culture: '',
      location: '',
      description: '',
      shortDescription: '',
      imageUrl: '',
      imageAlt: '',
      primaryMedia: null,
      gallery: [],
      materials: [],
      tags: [],
      notes: [],
      pageNumber: 1,
      searchText: '',
      searchKeywords: [],
      denominationSystem: '',
      denominationKey: null,
      denominationRank: 0,
      denominationBaseValue: null,
      sortYearStart: 0,
      sortYearEnd: null,
      estimatedPriceMin: 0,
      estimatedPriceMax: 0,
      estimatedPriceAvg: 0,
      weightGrams: null,
      sortYear: 0,
      metadata: {},
    })).resolves.toEqual([]);
  });
});
