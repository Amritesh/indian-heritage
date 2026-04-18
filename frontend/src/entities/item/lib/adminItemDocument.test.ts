import { describe, expect, it } from 'vitest';
import { buildAdminItemPayload } from '@/entities/item/lib/buildAdminItemPayload';
import { ItemRecord } from '@/entities/item/model/types';

const existingItem: ItemRecord = {
  id: 'coin-1',
  collectionId: 'collection-1',
  collectionSlug: 'sultanate',
  collectionName: 'Delhi Sultanate',
  title: 'Gold Tanka - Ghiyath-al-din Tughluq',
  subtitle: 'Gold Tanka, Ghiyath al-Din Tughlaq',
  period: 'AH 720-725 (1320-1325 AD)',
  dateText: 'AH 720-725 (1320-1325 AD)',
  culture: 'Delhi Sultanate',
  location: 'Delhi',
  description: 'Old description',
  shortDescription: 'Old description',
  imageUrl: '',
  imageAlt: '',
  primaryMedia: null,
  gallery: [],
  materials: ['Gold'],
  tags: ['Delhi Sultanate', 'Ghiyath al-Din Tughlaq'],
  notes: [],
  pageNumber: 7,
  searchText: '',
  searchKeywords: [],
  denominationSystem: 'shared-indic',
  denominationKey: 'tanka',
  denominationRank: 19,
  denominationBaseValue: 1,
  sortYearStart: 1320,
  sortYearEnd: 1325,
  estimatedPriceMin: 75000,
  estimatedPriceMax: 90000,
  estimatedPriceAvg: 82500,
  weightGrams: 11,
  sortYear: 1320,
  metadata: {
    denomination: 'Gold Tanka',
    rulerOrIssuer: 'Ghiyath-al-din Tughluq',
    mintOrPlace: 'Delhi',
    weightEstimate: '11.0 g',
    estimatedPriceInr: '75,000 - 90,000',
  },
};

describe('buildAdminItemPayload', () => {
  it('recomputes derived denomination and price fields from edited metadata', () => {
    const updated = buildAdminItemPayload(
      {
        ...existingItem,
        metadata: {
          ...existingItem.metadata,
          denomination: 'One Rupee',
          estimatedPriceInr: '₹1.70 lakh - ₹1.95 lakh',
          rulerOrIssuer: 'Ghiyath al-Din Tughluq I',
          mintOrPlace: 'Delhi (Hadrat Delhi)',
        },
      }
    );

    expect(updated.denominationKey).toBe('rupee');
    expect(updated.denominationRank).toBe(18);
    expect(updated.estimatedPriceMin).toBe(170000);
    expect(updated.estimatedPriceMax).toBe(195000);
    expect(updated.estimatedPriceAvg).toBe(182500);
    expect(updated.metadata.rulerOrIssuer).toBe('Ghiyath al-Din Tughlaq');
    expect(updated.metadata.mintOrPlace).toBe('Delhi');
  });
});
