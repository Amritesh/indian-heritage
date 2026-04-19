import { describe, expect, it } from 'vitest';
import { buildMigrationPayload } from './import-supabase-archive';

describe('buildMigrationPayload', () => {
  it('creates unique item identities when source snapshots reuse local item ids across batches', () => {
    const payload = buildMigrationPayload({
      exportedAt: '2026-04-19T00:00:00.000Z',
      source: 'firebase-firestore',
      collection: {
        slug: 'mughals',
        name: 'Mughals',
        displayName: 'Mughals',
        description: 'Imperial coinage',
        longDescription: 'Imperial coinage',
        culture: 'Mughal Empire',
        periodLabel: 'c. 1600s',
        heroImage: 'images/mughals/cover.png',
        sortOrder: 1,
      },
      items: [
        {
          id: 'mughals-coin-1',
          title: 'Silver Rupee - Jahangir',
          period: 'AH 1028 / 1618-1619 AD',
          dateText: 'AH 1028 / 1618-1619 AD',
          location: 'Patna',
          description: 'First source batch',
          primaryMedia: {
            storagePath: 'images/mughals-auto/coin_1.png',
          },
          metadata: {
            type: 'coin',
            denomination: 'Rupee',
            rulerOrIssuer: 'Jahangir',
            mintOrPlace: 'Patna',
            seriesOrCatalog: 'KM# 145.12',
          },
        },
        {
          id: 'mughals-coin-1',
          title: 'Rupee - Shah Jahan I',
          period: 'AH 1037-1068 / 1628-1658 AD',
          dateText: 'AH 1037-1068 / 1628-1658 AD',
          location: 'Lahore',
          description: 'Second source batch',
          primaryMedia: {
            storagePath: 'images/mughals-auto2/coin_1.png',
          },
          metadata: {
            type: 'coin',
            denomination: 'Rupee',
            rulerOrIssuer: 'Shah Jahan I',
            mintOrPlace: 'Lahore',
            seriesOrCatalog: 'KM# 222',
          },
        },
      ],
    });

    expect(payload.items).toHaveLength(2);
    expect(new Set(payload.items.map((row) => row.canonical_id)).size).toBe(2);
    expect(new Set(payload.items.map((row) => row.slug)).size).toBe(2);
    expect(new Set(payload.numismatic_item_profiles.map((row) => row.item_id)).size).toBe(2);
    expect(payload.items.map((row) => row.source_reference)).toEqual([
      'images/mughals-auto/coin_1.png',
      'images/mughals-auto2/coin_1.png',
    ]);
  });
});
