import { describe, expect, it } from 'vitest';
import { sortItems } from '@/entities/item/api/itemService';
import { ItemRecord } from '@/entities/item/model/types';

function buildItem(overrides: Partial<ItemRecord>): ItemRecord {
  return {
    id: 'item-1',
    collectionId: 'collection-1',
    collectionSlug: 'british',
    collectionName: 'British India',
    title: 'Sample Coin',
    subtitle: '',
    period: '',
    dateText: '',
    culture: 'British India',
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
    denominationSystem: 'shared-indic',
    denominationKey: null,
    denominationRank: 9999,
    denominationBaseValue: null,
    sortYearStart: 0,
    sortYearEnd: null,
    estimatedPriceMin: 0,
    estimatedPriceMax: 0,
    estimatedPriceAvg: 0,
    weightGrams: null,
    sortYear: 0,
    metadata: {},
    ...overrides,
  };
}

describe('sortItems', () => {
  it('sorts missing prices after priced items', () => {
    const items = [
      buildItem({ id: 'unknown', title: 'Unknown Price', estimatedPriceAvg: 0 }),
      buildItem({ id: 'cheap', title: 'Cheaper Coin', estimatedPriceAvg: 250 }),
      buildItem({ id: 'expensive', title: 'Expensive Coin', estimatedPriceAvg: 900 }),
    ];

    expect(sortItems(items, 'price_asc').map((item) => item.id)).toEqual(['cheap', 'expensive', 'unknown']);
    expect(sortItems(items, 'price_desc').map((item) => item.id)).toEqual(['expensive', 'cheap', 'unknown']);
  });
});
