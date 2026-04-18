import { describe, expect, it } from 'vitest';
import { buildAdminItemPayload } from '@/entities/item/lib/buildAdminItemPayload';
import { ItemFormData } from '@/entities/item/api/itemAdminService';

function buildForm(overrides: Partial<ItemFormData> = {}): ItemFormData {
  return {
    title: 'Gold Tanka - Ghiyath-al-din Tughluq',
    subtitle: '',
    description: 'A Delhi Sultanate gold coin.',
    shortDescription: 'A Delhi Sultanate gold coin.',
    period: 'AH 720-725 (1320-1325 AD)',
    dateText: 'AH 720-725 (1320-1325 AD)',
    culture: 'Delhi Sultanate',
    location: 'Delhi (Hadrat Delhi)',
    imageUrl: '',
    imageAlt: '',
    materials: ['Gold'],
    tags: [],
    notes: [],
    collectionId: 'sultanate',
    collectionSlug: 'sultanate',
    collectionName: 'Delhi Sultanate',
    metadata: {
      denomination: 'Gold Tanka',
      rulerOrIssuer: 'Ghiyath-al-din Tughluq',
      mintOrPlace: 'Delhi (Hadrat Delhi)',
      weightEstimate: '11.0 g',
      estimatedPriceInr: '75,000 - 90,000',
    },
    ...overrides,
  };
}

describe('buildAdminItemPayload', () => {
  it('recomputes derived price, denomination, weight, and search fields on save', () => {
    const payload = buildAdminItemPayload(buildForm());

    expect(payload.denominationKey).toBe('tanka');
    expect(payload.denominationRank).toBe(19);
    expect(payload.estimatedPriceMin).toBe(75000);
    expect(payload.estimatedPriceMax).toBe(90000);
    expect(payload.estimatedPriceAvg).toBe(82500);
    expect(payload.weightGrams).toBe(11);
    expect(payload.searchKeywords).toContain('tughlaq');
  });

  it('keeps unknown prices out of positive sort fields', () => {
    const payload = buildAdminItemPayload(
      buildForm({
        metadata: {
          denomination: 'One Rupee',
          rulerOrIssuer: 'George V, King Emperor',
          mintOrPlace: 'Bombay Mint',
          weightEstimate: '11.66 g',
          estimatedPriceInr: '',
        },
        culture: 'British India',
        collectionSlug: 'british',
        collectionName: 'British India',
        materials: ['Silver (0.917)'],
      }),
    );

    expect(payload.denominationKey).toBe('rupee');
    expect(payload.estimatedPriceMin).toBe(0);
    expect(payload.estimatedPriceMax).toBe(0);
    expect(payload.estimatedPriceAvg).toBe(0);
    expect(payload.searchKeywords).toContain('george');
  });
});
