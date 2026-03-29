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
    expect(normalized.searchKeywords).toContain('jahangir');
  });
});
