import { describe, expect, it } from 'vitest';
import { normalizeCollection } from '@/backend-support/mappers/normalizeCollection';

describe('normalizeCollection', () => {
  it('maps the merged princely-states collection into a Firestore collection record', () => {
    const normalized = normalizeCollection({
      slug: 'princely-states',
      itemCount: 29,
      heroImage: 'gs://indian-heritage-gallery-bucket/images/princeley-states-1-1/page-5.png',
      filterableMaterials: ['Silver'],
      timestamp: '2026-04-01T00:00:00.000Z',
    });

    expect(normalized.id).toBe('princely-states');
    expect(normalized.slug).toBe('princely-states');
    expect(normalized.name).toBe('Princely States');
    expect(normalized.sourceUrl).toContain('/api/items/princely-states');
    expect(normalized.heroImage).toBe('gs://indian-heritage-gallery-bucket/images/princeley-states-1-1/page-5.png');
    expect(normalized.itemCount).toBe(29);
  });

  it('maps the early-coinage collection into a Firestore collection record', () => {
    const normalized = normalizeCollection({
      slug: 'early-coinage',
      itemCount: 197,
      heroImage: 'gs://indian-heritage-gallery-bucket/images/early-coinage/page-6/coin_1.png',
      filterableMaterials: ['Silver', 'Copper'],
      timestamp: '2026-04-19T00:00:00.000Z',
    });

    expect(normalized.id).toBe('early-coinage');
    expect(normalized.slug).toBe('early-coinage');
    expect(normalized.name).toBe('Early Coinage');
    expect(normalized.sourceUrl).toContain('/api/items/early-coinage');
    expect(normalized.itemCount).toBe(197);
  });
});
