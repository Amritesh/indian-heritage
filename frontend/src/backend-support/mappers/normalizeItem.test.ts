import { describe, expect, it } from 'vitest';
import { normalizeItem } from '@/backend-support/mappers/normalizeItem';
import { rawItemSchema } from '@/backend-support/schemas/source';

describe('normalizeItem', () => {
  it('maps source payloads into Firestore item records', () => {
    const rawItem = rawItemSchema.parse({
      id: 'coin-1',
      title: 'Silver Rupee - Jahangir',
      description: 'Silver Rupee issued by Jahangir. Mint: Patna.',
      image: 'gs://indian-heritage-gallery-bucket/images/mughals-auto/coin_1.png',
      notes: ['Obverse note', 'Reverse note'],
      period: 'AH 1028 / 1618-1619 AD',
      region: 'Patna',
      materials: ['Silver'],
      display_labels: ['Wt: 11.4 grams', 'Very Fine (VF)'],
      metadata: {
        denomination: 'Silver Rupee',
        ruler_or_issuer: 'Jahangir',
        mint_or_place: 'Patna',
        estimated_price_inr: '4,500 - 7,500',
        confidence: 92,
      },
      page: 1,
    });

    const normalized = normalizeItem(rawItem, 'mughals', '2026-03-29T00:00:00.000Z');

    expect(normalized.id).toBe('mughals-coin-1');
    expect(normalized.collectionSlug).toBe('mughals');
    expect(normalized.imageUrl).toContain('firebasestorage.googleapis.com');
    expect(normalized.metadata.rulerOrIssuer).toBe('Jahangir');
    expect(normalized.metadata.confidence).toBe('92');
    expect(normalized.denominationSystem).toBe('shared');
    expect(normalized.denominationKey).toBe('rupee');
    expect(normalized.denominationRank).toBe(10);
    expect(normalized.denominationBaseValue).toBe(1);
    expect(normalized.sortYearStart).toBe(1618);
    expect(normalized.sortYearEnd).toBe(1619);
    expect(normalized.estimatedPriceMin).toBe(4500);
    expect(normalized.estimatedPriceMax).toBe(7500);
    expect(normalized.estimatedPriceAvg).toBe(6000);
    expect(normalized.weightGrams).toBe(11.4);
    expect(normalized.searchKeywords).toContain('jahangir');
  });

  it('derives numeric fields used by Firestore sorting', () => {
    const rawItem = rawItemSchema.parse({
      id: 'coin-2',
      title: 'Silver Rupee - Aurangzeb',
      description: 'Silver Rupee issued by Aurangzeb. Mint: Patna.',
      image: 'gs://indian-heritage-gallery-bucket/images/mughals-auto/coin_2.png',
      notes: ['Catalogued from pair'],
      period: 'AH 1079 (c. 1668-1669 AD)',
      region: 'Patna',
      materials: ['Silver'],
      metadata: {
        denomination: 'Silver Rupee',
        ruler_or_issuer: 'Aurangzeb',
        mint_or_place: 'Patna',
        estimated_price_inr: '2,000 - 3,500',
      },
      page: 2,
    });

    const normalized = normalizeItem(rawItem, 'mughals', '2026-04-01T00:00:00.000Z');

    expect(normalized.estimatedPriceMin).toBe(2000);
    expect(normalized.estimatedPriceMax).toBe(3500);
    expect(normalized.estimatedPriceAvg).toBe(2750);
    expect(normalized.sortYearStart).toBe(1668);
    expect(normalized.sortYearEnd).toBe(1669);
    expect(normalized.sortYear).toBe(1668);
  });

  it('prefers AD shorthand ranges and sorts unknown denominations last', () => {
    const rawItem = rawItemSchema.parse({
      id: 'coin-3',
      title: 'Silver Token',
      description: 'Silver token with mixed period notation.',
      image: 'gs://indian-heritage-gallery-bucket/images/mughals-auto/coin_3.png',
      notes: [],
      period: 'AH 991 (1582-83 AD)',
      region: 'Patna',
      materials: ['Silver'],
      metadata: {
        denomination: 'Mystery Token',
        ruler_or_issuer: 'Jahangir',
        mint_or_place: 'Patna',
      },
      page: 3,
    });

    const normalized = normalizeItem(rawItem, 'mughals', '2026-04-01T00:00:00.000Z');

    expect(normalized.denominationKey).toBe('');
    expect(normalized.denominationRank).toBe(9999);
    expect(normalized.sortYearStart).toBe(1582);
    expect(normalized.sortYearEnd).toBe(1583);
    expect(normalized.sortYear).toBe(1582);
  });
});
