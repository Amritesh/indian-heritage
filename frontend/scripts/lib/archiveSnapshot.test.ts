import { describe, expect, it } from 'vitest';
import { normalizePairedOutputCatalogue, titleizeSlug } from './archiveSnapshot';

describe('archiveSnapshot helpers', () => {
  it('titleizes collection slugs for fallback labels', () => {
    expect(titleizeSlug('indian-foreign-rulers')).toBe('Indian Foreign Rulers');
  });

  it('wraps paired-output catalogues into archive snapshots', () => {
    const snapshot = normalizePairedOutputCatalogue(
      {
        catalogue: [
          {
            image_path: '/tmp/paired/coin_001.png',
            ruler_or_issuer: 'Akbar',
            year_or_period: '1556-1605',
            mint_or_place: 'Agra',
            denomination: 'Rupee',
            series_or_catalog: 'KM 12',
            material: 'Silver',
            condition: 'VF',
            confidence: 'High',
            notes: ['paired output'],
            source_pages: [5, 6],
          },
        ],
      },
      { collectionSlug: 'indian-foreign-rulers' },
    );

    expect(snapshot.source).toBe('paired-output');
    expect(snapshot.collection.slug).toBe('indian-foreign-rulers');
    expect(snapshot.collection.displayName).toBe('Indian Foreign Rulers');
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0].id).toBe('coin_001');
    expect(snapshot.items[0].title).toBe('Rupee - Akbar');
    expect(snapshot.items[0].sourcePageLabel).toBe('page-5-6');
    expect(snapshot.items[0].metadata?.mintOrPlace).toBe('Agra');
  });
});
