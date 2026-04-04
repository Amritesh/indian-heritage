import { describe, expect, it } from 'vitest';

import { deriveAdminItemDocumentFields } from './itemAdminService';

describe('deriveAdminItemDocumentFields', () => {
  it('recomputes price, denomination, and canonical search fields on save', () => {
    const result = deriveAdminItemDocumentFields({
      title: 'Gold Tanka - Ghiyath-al-din Tughluq',
      subtitle: '',
      description: 'Delhi Sultanate gold coin.',
      shortDescription: '',
      period: 'AH 720-725 (1320-1325 AD)',
      dateText: 'AH 720-725 (1320-1325 AD)',
      culture: 'Delhi Sultanate',
      location: 'Delhi (Hadrat Delhi)',
      imageUrl: 'https://example.com/coin.png',
      imageAlt: 'coin',
      materials: ['Gold'],
      tags: [],
      notes: [],
      collectionId: 'sultanate',
      collectionSlug: 'sultanate',
      collectionName: 'Delhi Sultanate',
      metadata: {
        denomination: 'Gold Tanka',
        rulerOrIssuer: 'Ghiyath al-Din Tughluq I (Delhi Sultanate)',
        mintOrPlace: 'Delhi (Hadrat Delhi)',
        estimatedPriceInr: '165,000 - 220,000',
        weightEstimate: '11.0 g',
      },
    });

    expect(result.denominationKey).toBe('tanka');
    expect(result.denominationRank).toBe(19);
    expect(result.estimatedPriceMin).toBe(165000);
    expect(result.estimatedPriceMax).toBe(220000);
    expect(result.estimatedPriceAvg).toBe(192500);
    expect(result.tags).toContain('Ghiyath al-Din Tughlaq');
    expect(result.searchKeywords).toContain('ghiyath');
  });
});
